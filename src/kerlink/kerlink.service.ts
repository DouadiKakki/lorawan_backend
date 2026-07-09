import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as dgram from 'dgram';
import * as crypto from 'crypto';
import { UplinkMessagesService } from '../uplinks/uplinks.service';
import { EndDevicesService } from '../end-devices/end-devices.service';
import { GatewaysService } from '../gateways/gateways.service';
import { aesCmac, cryptPayload } from './lorawan-crypto.util';
import { KerlinkDownlinkService } from './kerlink-downlink.service';

const PKT_PUSH_DATA = 0x00;
const PKT_PUSH_ACK  = 0x01;
const PKT_PULL_DATA = 0x02;
const PKT_PULL_RESP = 0x03;
const PKT_PULL_ACK  = 0x04;

const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000;
const NET_ID = Buffer.from('000000', 'hex');

@Injectable()
export class KerlinkService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KerlinkService.name);
  private server: dgram.Socket | null = null;
  private offlineTimer: NodeJS.Timeout | null = null;

  constructor(
    private config: ConfigService,
    private uplinkService: UplinkMessagesService,
    private endDevicesService: EndDevicesService,
    private eventEmitter: EventEmitter2,
    private gatewaysService: GatewaysService,
    private downlinkService: KerlinkDownlinkService,
  ) {}

  onModuleInit() {
    const port = parseInt(this.config.get<string>('KERLINK_UDP_PORT') ?? '1700', 10);
    this.server = dgram.createSocket('udp4');

    this.server.on('listening', () => {
      this.logger.log(`Kerlink UDP server listening on port ${port}`);
    });

    this.server.on('message', (msg, rinfo) => {
      this.handleUdp(msg, rinfo).catch(err =>
        this.logger.error('Kerlink UDP handler error', err),
      );
    });

    this.server.on('error', (err) => {
      this.logger.error('Kerlink UDP socket error', err.message);
    });

    this.server.bind(port);
    this.downlinkService.registerSocket(this.server);

    this.offlineTimer = setInterval(() => {
      this.gatewaysService.markStaleOffline(OFFLINE_THRESHOLD_MS).catch(err =>
        this.logger.error('Failed to mark stale gateways offline', err),
      );
    }, 60_000);
  }

  onModuleDestroy() {
    this.server?.close();
    if (this.offlineTimer) clearInterval(this.offlineTimer);
  }

  // ─── UDP dispatch ────────────────────────────────────────────────────────────

  private async handleUdp(msg: Buffer, rinfo: dgram.RemoteInfo) {
    if (msg.length < 4) return;

    const version  = msg.readUInt8(0);
    const token    = msg.readUInt16BE(1);
    const pktType  = msg.readUInt8(3);

    if (pktType === PKT_PULL_DATA) {
      this.downlinkService.registerGatewayPath(rinfo.address, rinfo.port);
      this.logger.debug(`PULL_DATA from ${rinfo.address}:${rinfo.port}`);

      const ack = Buffer.alloc(4);
      ack.writeUInt8(version, 0);
      ack.writeUInt16BE(token, 1);
      ack.writeUInt8(PKT_PULL_ACK, 3);
      this.server!.send(ack, rinfo.port, rinfo.address);
      return;
    }

    if (pktType !== PKT_PUSH_DATA) {
      this.logger.debug(`Unknown packet type 0x${pktType.toString(16)} — ignored`);
      return;
    }

    const gatewayEUI = msg.slice(4, 12).toString('hex').toUpperCase();
    this.logger.log(`PUSH_DATA from ${rinfo.address}:${rinfo.port} — gatewayEUI=${gatewayEUI}`);
    this.downlinkService.registerGatewayPath(rinfo.address, rinfo.port, gatewayEUI);

    const ack = Buffer.alloc(4);
    ack.writeUInt8(version, 0);
    ack.writeUInt16BE(token, 1);
    ack.writeUInt8(PKT_PUSH_ACK, 3);
    this.server!.send(ack, rinfo.port, rinfo.address);

    this.gatewaysService.markSeen(gatewayEUI).catch(err =>
      this.logger.warn(`markSeen gateway failed for ${gatewayEUI}: ${err.message}`),
    );

    let data: any;
    try {
      data = JSON.parse(msg.slice(12).toString('utf8'));
    } catch {
      this.logger.warn('Invalid JSON from Kerlink gateway');
      return;
    }

    if (data.stat && typeof data.stat.lati === 'number' && typeof data.stat.long === 'number') {
      this.gatewaysService.updateLocationFromStat(gatewayEUI, data.stat.lati, data.stat.long, data.stat.alti).catch(err =>
        this.logger.warn(`updateLocationFromStat failed for ${gatewayEUI}: ${err.message}`),
      );
    }

    if (!Array.isArray(data.rxpk)) return;

    for (const pkt of data.rxpk) {
      if (!pkt.data) continue;

      const phy = Buffer.from(pkt.data, 'base64');

      // ── OTAA Join Request ─────────────────────────────────────────────────
      const joinReq = this.parseJoinRequest(phy);
      if (joinReq) {
        await this.handleJoinRequest(joinReq, pkt, gatewayEUI);
        continue;
      }

      // ── Normal data uplink ────────────────────────────────────────────────
      const parsed = this.parseLoRaWAN(phy);
      if (!parsed || parsed.note) {
        this.logger.debug(`Skipped packet from ${gatewayEUI}: ${parsed?.note ?? 'parse failed'}`);
        continue;
      }

      this.logger.log(`Uplink from ${gatewayEUI} — DevAddr=${parsed.devAddrHex} fCnt=${parsed.fCnt16}`);

      const rssi = this.getRssi(pkt);
      const snr  = this.getSnr(pkt);
      const rf   = this.parseRfMeta(pkt);

      let rawData     = parsed.frmPayload;
      let decodedData: Record<string, any> = {};

      const dev = await this.endDevicesService.findByDevAddr(parsed.devAddrHex);

      if (dev?.appSKey) {
        try {
          rawData = cryptPayload(dev.appSKey, parsed.devAddrLE, parsed.fCnt32, 0, parsed.frmPayload);
          decodedData = {
            hex:   rawData.toString('hex'),
            ascii: rawData.toString('utf8').replace(/[^\x20-\x7E]/g, '.'),
          };
        } catch (e: any) {
          this.logger.warn(`Decrypt failed for DevAddr ${parsed.devAddrHex}: ${e.message}`);
        }
      }

      const uplink = await this.uplinkService.create({
        deviceEUI:      dev?.devEUI ?? parsed.devAddrHex,
        gatewayEUI,
        rssi:           rssi ?? 0,
        snr:            snr  ?? 0,
        frequency:      pkt.freq ?? 0,
        dataRate:       rf.dataRate,
        codingRate:     rf.codingRate,
        modulation:     rf.modulation,
        spreadingFactor: rf.spreadingFactor,
        bandwidth:      rf.bandwidth,
        channel:        rf.channel,
        fPort:          parsed.fport ?? 0,
        fCnt:           parsed.fCnt16,
        data:           rawData,
        decodedData,
        receivedAt:     new Date(),
      });

      if (dev) {
        this.endDevicesService.markSeen(parsed.devAddrHex, gatewayEUI, rssi ?? 0, parsed.fCnt16).catch(err =>
          this.logger.warn(`markSeen device failed: ${err.message}`),
        );
      }

      this.eventEmitter.emit('uplink.received', uplink);
    }
  }

  // ─── OTAA ────────────────────────────────────────────────────────────────────

  private parseJoinRequest(phy: Buffer): {
    joinEUI: string; devEUI: string; devNonce: Buffer; mic: Buffer; raw: Buffer;
  } | null {
    if (!phy || phy.length !== 23) return null;
    const mtype = (phy[0] >> 5) & 0x07;
    if (mtype !== 0) return null;

    return {
      joinEUI:  Buffer.from(phy.slice(1, 9)).reverse().toString('hex').toUpperCase(),
      devEUI:   Buffer.from(phy.slice(9, 17)).reverse().toString('hex').toUpperCase(),
      devNonce: phy.slice(17, 19),
      mic:      phy.slice(19, 23),
      raw:      phy,
    };
  }

  private async handleJoinRequest(
    joinReq: { joinEUI: string; devEUI: string; devNonce: Buffer; mic: Buffer; raw: Buffer },
    pkt: any,
    gatewayEUI: string,
  ) {
    this.logger.log(`OTAA Join Request — DevEUI=${joinReq.devEUI} JoinEUI=${joinReq.joinEUI}`);

    const dev = await this.endDevicesService.findByDevEUI(joinReq.devEUI);
    if (!dev) {
      this.logger.warn(`Join: DevEUI ${joinReq.devEUI} not registered`);
      return;
    }
    if (dev.disabled) {
      this.logger.warn(`Join: DevEUI ${joinReq.devEUI} is deactivated`);
      return;
    }
    if (!dev.appKey) {
      this.logger.warn(`Join: DevEUI ${joinReq.devEUI} has no appKey`);
      return;
    }
    if (dev.joinEUI && dev.joinEUI.toUpperCase() !== joinReq.joinEUI) {
      this.logger.warn(`Join: JoinEUI mismatch for ${joinReq.devEUI}`);
      return;
    }

    const appKey = Buffer.from(dev.appKey, 'hex');
    const nwkKey = dev.nwkKey ? Buffer.from(dev.nwkKey, 'hex') : appKey;

    const micApp = aesCmac(appKey, joinReq.raw.slice(0, 19)).slice(0, 4);
    const micNwk = aesCmac(nwkKey, joinReq.raw.slice(0, 19)).slice(0, 4);

    let joinKey: Buffer;
    if (micNwk.equals(joinReq.mic)) {
      joinKey = nwkKey;
    } else if (micApp.equals(joinReq.mic)) {
      joinKey = appKey;
    } else {
      this.logger.warn(`Join: MIC invalid for ${joinReq.devEUI}`);
      return;
    }

    const joinNonce  = crypto.randomBytes(3);
    const devAddrLE  = crypto.randomBytes(4);
    const devAddrHex = Buffer.from(devAddrLE).reverse().toString('hex').toLowerCase();

    const nwkSKey = this.deriveSessionKey(joinKey, 0x01, joinNonce, NET_ID, joinReq.devNonce);
    const appSKey = this.deriveSessionKey(joinKey, 0x02, joinNonce, NET_ID, joinReq.devNonce);

    const joinAcceptPhy = this.buildJoinAcceptPhy(joinKey, joinNonce, devAddrLE);

    // Persist session keys on the existing device record
    await this.endDevicesService.updateOtaaSession(dev._id.toString(), {
      devAddr:      devAddrHex,
      appSKey:      appSKey.toString('hex').toUpperCase(),
      nwkSKey:      nwkSKey.toString('hex').toUpperCase(),
      sessionStart: new Date(),
    });

    this.logger.log(`Join: DevAddr=${devAddrHex} AppSKey=${appSKey.toString('hex').toUpperCase()}`);

    this.sendJoinAccept(pkt, joinAcceptPhy, gatewayEUI);
  }

  private buildJoinAcceptPhy(joinKey: Buffer, joinNonce: Buffer, devAddrLE: Buffer): Buffer {
    const payload = Buffer.concat([
      joinNonce,
      NET_ID,
      devAddrLE,
      Buffer.from([0x00]), // DLSettings
      Buffer.from([0x05]), // RXDelay = 5 s
    ]);

    const mhdr = Buffer.from([0x20]);
    const mic  = aesCmac(joinKey, Buffer.concat([mhdr, payload])).slice(0, 4);
    const plain = Buffer.concat([payload, mic]);

    // LoRaWAN: Join Accept body is encrypted with AES-128 decrypt
    const decipher = crypto.createDecipheriv('aes-128-ecb', joinKey, null);
    decipher.setAutoPadding(false);
    const encrypted = Buffer.concat([decipher.update(plain), decipher.final()]);

    return Buffer.concat([mhdr, encrypted]);
  }

  private deriveSessionKey(key: Buffer, type: number, joinNonce: Buffer, netId: Buffer, devNonce: Buffer): Buffer {
    const block = Buffer.alloc(16, 0);
    block[0] = type;
    joinNonce.copy(block, 1);
    netId.copy(block, 4);
    devNonce.copy(block, 7);

    const cipher = crypto.createCipheriv('aes-128-ecb', key, null);
    cipher.setAutoPadding(false);
    return Buffer.concat([cipher.update(block), cipher.final()]);
  }

  private sendJoinAccept(pkt: any, phyPayload: Buffer, gatewayEUI: string) {
    const gatewayDownlink = this.downlinkService.getGatewayPath(gatewayEUI);
    if (!gatewayDownlink) {
      this.logger.warn(`JoinAccept: no PULL_DATA gateway path available for ${gatewayEUI}`);
      return;
    }
    if (typeof pkt.tmst !== 'number') {
      this.logger.warn('JoinAccept: no tmst in uplink packet');
      return;
    }

    const txpk = {
      imme: false,
      tmst: (pkt.tmst + 5_000_000) % 4_294_967_296,
      freq: pkt.freq,
      rfch: 0,
      powe: 14,
      modu: 'LORA',
      datr: pkt.datr,
      codr: '4/5',
      ipol: true,
      size: phyPayload.length,
      data: phyPayload.toString('base64'),
    };

    const json = Buffer.from(JSON.stringify({ txpk }));
    const down = Buffer.alloc(4 + json.length);
    down.writeUInt8(2, 0);
    down.writeUInt16BE(Math.floor(Math.random() * 0xffff), 1);
    down.writeUInt8(PKT_PULL_RESP, 3);
    json.copy(down, 4);

    this.server!.send(down, gatewayDownlink.port, gatewayDownlink.address);
    this.logger.log(`JoinAccept sent via ${gatewayDownlink.address}:${gatewayDownlink.port}`);
  }

  // ─── LoRaWAN uplink parse ─────────────────────────────────────────────────────

  private parseLoRaWAN(phy: Buffer): {
    devAddrHex: string;
    devAddrLE: Buffer;
    fCnt16: number;
    fCnt32: number;
    fport: number | null;
    frmPayload: Buffer;
    note?: string;
  } | null {
    if (!phy || phy.length < 12) return null;

    const mtype = (phy[0] >> 5) & 0x07;
    if (mtype !== 2 && mtype !== 4) {
      return { devAddrHex: '', devAddrLE: Buffer.alloc(0), fCnt16: 0, fCnt32: 0, fport: null, frmPayload: Buffer.alloc(0), note: 'Not a data-up frame' };
    }

    const macPayload = phy.slice(1, phy.length - 4);
    if (macPayload.length < 7) return null;

    const devAddrLE  = macPayload.slice(0, 4);
    const devAddrHex = Buffer.from(devAddrLE).reverse().toString('hex');
    const fctrl      = macPayload[4];
    const fCnt16     = macPayload.readUInt16LE(5);
    const fOptsLen   = fctrl & 0x0f;
    const fhdrLen    = 4 + 1 + 2 + fOptsLen;

    if (macPayload.length < fhdrLen) return null;

    const afterFhdr = macPayload.slice(fhdrLen);
    let fport: number | null = null;
    let frmPayload = Buffer.alloc(0);

    if (afterFhdr.length >= 1) {
      fport      = afterFhdr[0];
      frmPayload = afterFhdr.slice(1);
    }

    return { devAddrHex, devAddrLE, fCnt16, fCnt32: fCnt16, fport, frmPayload };
  }

  // ─── RF metadata ─────────────────────────────────────────────────────────────

  private parseRfMeta(pkt: any): {
    dataRate?: string; codingRate?: string; modulation?: string;
    spreadingFactor?: number; bandwidth?: number; channel?: number;
  } {
    const dataRate  = typeof pkt.datr === 'string' ? pkt.datr : undefined;
    const codingRate = typeof pkt.codr === 'string' ? pkt.codr : undefined;
    const modulation = typeof pkt.modu === 'string' ? pkt.modu : undefined;
    const channel   = typeof pkt.chan === 'number'  ? pkt.chan  : undefined;

    let spreadingFactor: number | undefined;
    let bandwidth: number | undefined;

    // datr for LORA looks like "SF7BW125"
    if (dataRate) {
      const m = dataRate.match(/SF(\d+)BW(\d+)/i);
      if (m) {
        spreadingFactor = parseInt(m[1], 10);
        bandwidth       = parseInt(m[2], 10);
      }
    }

    return { dataRate, codingRate, modulation, spreadingFactor, bandwidth, channel };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private getRssi(pkt: any): number | null {
    const v = pkt.rssi ?? pkt.rssis ?? pkt.rsig?.[0]?.rssic ?? pkt.rsig?.[0]?.rssis;
    return typeof v === 'number' && !Number.isNaN(v) ? v : null;
  }

  private getSnr(pkt: any): number | null {
    const v = pkt.lsnr ?? pkt.snr;
    return typeof v === 'number' && !Number.isNaN(v) ? v : null;
  }
}
