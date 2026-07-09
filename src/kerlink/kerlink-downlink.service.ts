import { Injectable, Logger } from '@nestjs/common';
import * as dgram from 'dgram';
import { EndDeviceDocument } from '../end-devices/schemas/end-device.schema';
import { cryptPayload, computeDataMic } from './lorawan-crypto.util';

const PKT_PULL_RESP = 0x03;

@Injectable()
export class KerlinkDownlinkService {
  private readonly logger = new Logger(KerlinkDownlinkService.name);
  private socket: dgram.Socket | null = null;

  /** Per-gateway PULL_DATA paths, keyed by gatewayEUI — used to push downlinks (class C style, immediate) */
  private gatewayPaths = new Map<string, { address: string; port: number }>();
  /** Most recent PULL_DATA path overall — fallback for join-accept when gatewayEUI isn't known yet */
  private lastGatewayDownlink: { address: string; port: number } | null = null;

  registerSocket(socket: dgram.Socket) {
    this.socket = socket;
  }

  registerGatewayPath(address: string, port: number, gatewayEUI?: string) {
    const path = { address, port };
    this.lastGatewayDownlink = path;
    if (gatewayEUI) this.gatewayPaths.set(gatewayEUI, path);
  }

  getGatewayPath(gatewayEUI?: string) {
    if (gatewayEUI) return this.gatewayPaths.get(gatewayEUI) ?? null;
    return this.lastGatewayDownlink;
  }

  /** Sends a LoRaWAN unconfirmed/confirmed data downlink to a device via its gateway's Kerlink UDP path. */
  async sendDataDownlink(device: EndDeviceDocument, fPort: number, payload: Buffer, confirmed: boolean): Promise<void> {
    if (!this.socket) throw new Error('Kerlink UDP socket not initialized');
    const lastGatewayEUI = device.connectedGateways[device.connectedGateways.length - 1]?.gatewayEUI;
    const gatewayDownlink = this.getGatewayPath(lastGatewayEUI) ?? this.getGatewayPath();
    if (!gatewayDownlink) throw new Error('No Kerlink gateway path available (no recent PULL_DATA)');
    if (!device.devAddr || !device.nwkSKey || !device.appSKey) {
      throw new Error('Device missing session keys (devAddr/appSKey/nwkSKey) — not joined');
    }

    const devAddrLE = Buffer.from(device.devAddr, 'hex').reverse();
    const fCntDown = device.fCntDown ?? 0;
    const encKeyHex = fPort === 0 ? device.nwkSKey : device.appSKey;

    const encryptedPayload = cryptPayload(encKeyHex, devAddrLE, fCntDown, 1, payload);

    const mhdr = Buffer.from([confirmed ? 0xa0 : 0x60]);
    const fctrl = Buffer.from([0x00]);
    const fcnt = Buffer.alloc(2);
    fcnt.writeUInt16LE(fCntDown & 0xffff, 0);

    const macPayload = Buffer.concat([
      devAddrLE,
      fctrl,
      fcnt,
      Buffer.from([fPort]),
      encryptedPayload,
    ]);

    const mic = computeDataMic(device.nwkSKey, devAddrLE, fCntDown, 1, Buffer.concat([mhdr, macPayload]));
    const phyPayload = Buffer.concat([mhdr, macPayload, mic]);

    const txpk = {
      imme: true,
      freq: 868.1,
      rfch: 0,
      powe: 14,
      modu: 'LORA',
      datr: 'SF7BW125',
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

    this.socket.send(down, gatewayDownlink.port, gatewayDownlink.address);
    this.logger.log(`Data downlink sent to DevAddr=${device.devAddr} fCntDown=${fCntDown} via ${gatewayDownlink.address}:${gatewayDownlink.port}`);
  }
}
