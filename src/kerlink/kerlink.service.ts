import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as dgram from 'dgram';
import * as crypto from 'crypto';
import { UplinkMessagesService } from '../uplinks/uplinks.service';
import { EndDevicesService } from '../end-devices/end-devices.service';
import { GatewaysService } from '../gateways/gateways.service';

const PKT_PUSH_DATA = 0x00;
const PKT_PUSH_ACK = 0x01;
const PKT_PULL_DATA = 0x02;
const PKT_PULL_ACK = 0x04;

const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

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
  ) {}

  onModuleInit() {
    const port = this.config.get<number>('KERLINK_UDP_PORT') ?? 1700;
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

  private async handleUdp(msg: Buffer, rinfo: dgram.RemoteInfo) {
    if (msg.length < 4) return;

    const version = msg.readUInt8(0);
    const token = msg.readUInt16BE(1);
    const pktType = msg.readUInt8(3);

    if (pktType === PKT_PULL_DATA) {
      this.logger.debug(`PULL_DATA from ${rinfo.address}:${rinfo.port} — sending PULL_ACK`);
      const ack = Buffer.alloc(4);
      ack.writeUInt8(version, 0);
      ack.writeUInt16BE(token, 1);
      ack.writeUInt8(PKT_PULL_ACK, 3);
      this.server!.send(ack, rinfo.port, rinfo.address);
      return;
    }

    if (pktType !== PKT_PUSH_DATA) {
      this.logger.debug(`Unknown packet type 0x${pktType.toString(16)} from ${rinfo.address} — ignored`);
      return;
    }

    const gatewayEUI = msg.slice(4, 12).toString('hex').toUpperCase();
    this.logger.log(`PUSH_DATA from ${rinfo.address}:${rinfo.port} — gatewayEUI=${gatewayEUI}`);

    const ack = Buffer.alloc(4);
    ack.writeUInt8(version, 0);
    ack.writeUInt16BE(token, 1);
    ack.writeUInt8(PKT_PUSH_ACK, 3);
    this.server!.send(ack, rinfo.port, rinfo.address);
    this.logger.debug(`PUSH_ACK sent to ${rinfo.address}:${rinfo.port}`);

    this.gatewaysService.markSeen(gatewayEUI).then(() => {
      this.logger.log(`markSeen OK — gatewayEUI=${gatewayEUI}`);
    }).catch(err =>
      this.logger.warn(`markSeen failed for ${gatewayEUI}: ${err.message}`),
    );

    let data: any;
    try {
      data = JSON.parse(msg.slice(12).toString('utf8'));
    } catch {
      this.logger.warn('Invalid JSON from Kerlink gateway');
      return;
    }

    if (!Array.isArray(data.rxpk)) {
      this.logger.debug(`No rxpk array in payload from ${gatewayEUI}`);
      return;
    }

    this.logger.log(`${data.rxpk.length} rxpk packet(s) from ${gatewayEUI}`);

    for (const pkt of data.rxpk) {
      if (!pkt.data) continue;

      const phy = Buffer.from(pkt.data, 'base64');
      const parsed = this.parseLoRaWAN(phy);
      if (!parsed || parsed.note) {
        this.logger.debug(`Skipped packet from ${gatewayEUI}: ${parsed?.note ?? 'parse failed'}`);
        continue;
      }
      this.logger.log(`LoRaWAN uplink from ${gatewayEUI} — DevAddr=${parsed.devAddrHex} fCnt=${parsed.fCnt16}`);

      const rssi = this.getRssi(pkt);
      const snr = this.getSnr(pkt);

      let rawData = parsed.frmPayload;
      let decodedData: Record<string, any> = {};

      const dev = await this.endDevicesService.findByDevAddr(parsed.devAddrHex);

      if (dev?.appSKey) {
        try {
          rawData = this.decryptPayload(
            dev.appSKey,
            parsed.devAddrLE,
            parsed.fCnt32,
            0,
            parsed.frmPayload,
          );
          decodedData = { hex: rawData.toString('hex'), ascii: rawData.toString('utf8').replace(/[^\x20-\x7E]/g, '.') };
        } catch (e: any) {
          this.logger.warn(`Decrypt failed for DevAddr ${parsed.devAddrHex}: ${e.message}`);
        }
      }

      const uplink = await this.uplinkService.create({
        deviceEUI: dev?.devEUI ?? parsed.devAddrHex,
        gatewayEUI,
        rssi: rssi ?? 0,
        snr: snr ?? 0,
        frequency: pkt.freq ?? 0,
        fPort: parsed.fport ?? 0,
        fCnt: parsed.fCnt16,
        data: rawData,
        decodedData,
        receivedAt: new Date(),
      });

      if (dev) {
        this.endDevicesService.markSeen(parsed.devAddrHex, gatewayEUI, rssi ?? 0).catch(err =>
          this.logger.warn(`markSeen device failed: ${err.message}`),
        );
      }

      this.eventEmitter.emit('uplink.received', uplink);
    }
  }

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
    // 2 = Unconfirmed Data Up, 4 = Confirmed Data Up
    if (mtype !== 2 && mtype !== 4) {
      return { devAddrHex: '', devAddrLE: Buffer.alloc(0), fCnt16: 0, fCnt32: 0, fport: null, frmPayload: Buffer.alloc(0), note: 'Not a data-up frame' };
    }

    const macPayload = phy.slice(1, phy.length - 4);
    if (macPayload.length < 7) return null;

    const devAddrLE = macPayload.slice(0, 4);
    const devAddrHex = Buffer.from(devAddrLE).reverse().toString('hex');
    const fctrl = macPayload[4];
    const fCnt16 = macPayload.readUInt16LE(5);
    const fOptsLen = fctrl & 0x0f;
    const fhdrLen = 4 + 1 + 2 + fOptsLen;

    if (macPayload.length < fhdrLen) return null;

    const afterFhdr = macPayload.slice(fhdrLen);
    let fport: number | null = null;
    let frmPayload = Buffer.alloc(0);

    if (afterFhdr.length >= 1) {
      fport = afterFhdr[0];
      frmPayload = afterFhdr.slice(1);
    }

    return { devAddrHex, devAddrLE, fCnt16, fCnt32: fCnt16, fport, frmPayload };
  }

  private decryptPayload(appSKeyHex: string, devAddrLE: Buffer, fCnt32: number, dir: number, payload: Buffer): Buffer {
    const key = Buffer.from(appSKeyHex, 'hex');
    if (key.length !== 16) throw new Error('AppSKey must be 16 bytes');

    const out = Buffer.alloc(payload.length);
    const blocks = Math.ceil(payload.length / 16);

    for (let i = 1; i <= blocks; i++) {
      const Ai = Buffer.alloc(16, 0);
      Ai[0] = 0x01;
      Ai[5] = dir & 0x01;
      devAddrLE.copy(Ai, 6);
      Ai.writeUInt32LE(fCnt32 >>> 0, 10);
      Ai[15] = i & 0xff;

      const cipher = crypto.createCipheriv('aes-128-ecb', key, null);
      cipher.setAutoPadding(false);
      const Si = Buffer.concat([cipher.update(Ai), cipher.final()]);

      const start = (i - 1) * 16;
      const end = Math.min(start + 16, payload.length);
      for (let j = start; j < end; j++) {
        out[j] = payload[j] ^ Si[j - start];
      }
    }

    return out;
  }

  private getRssi(pkt: any): number | null {
    const v = pkt.rssi ?? pkt.rsig ?? pkt.rssis;
    return typeof v === 'number' && !Number.isNaN(v) ? v : null;
  }

  private getSnr(pkt: any): number | null {
    const v = pkt.lsnr ?? pkt.snr;
    return typeof v === 'number' && !Number.isNaN(v) ? v : null;
  }
}
