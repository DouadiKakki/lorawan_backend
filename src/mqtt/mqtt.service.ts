import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { UplinkMessagesService } from '../uplinks/uplinks.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client: mqtt.MqttClient | null = null;
  private readonly logger = new Logger(MqttService.name);

  constructor(
    private config: ConfigService,
    private uplinkService: UplinkMessagesService,
    private eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    const url = this.config.get<string>('MQTT_BROKER_URL');
    if (!url) {
      this.logger.warn('MQTT_BROKER_URL not set, MQTT bridge disabled');
      return;
    }
    const username = this.config.get<string>('MQTT_USERNAME') || undefined;
    const password = this.config.get<string>('MQTT_PASSWORD') || undefined;

    this.client = mqtt.connect(url, {
      username,
      password,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
    });

    this.client.on('connect', () => {
      this.logger.log(`Connected to MQTT broker: ${url}`);
      this.client!.subscribe('application/+/device/+/event/up', (err) => {
        if (err) this.logger.error('MQTT subscribe error', err);
      });
    });

    this.client.on('message', (topic, payload) => {
      this.handleMessage(topic, payload).catch(err =>
        this.logger.error('Failed to handle MQTT message', err),
      );
    });

    this.client.on('error', (err) => this.logger.error('MQTT error', err.message));
    this.client.on('offline', () => this.logger.warn('MQTT broker offline, will retry...'));
  }

  onModuleDestroy() {
    this.client?.end();
  }

  publish(topic: string, payload: string | Buffer): void {
    if (!this.client?.connected) {
      this.logger.warn(`MQTT not connected, cannot publish to ${topic}`);
      return;
    }
    this.client.publish(topic, payload, { qos: 0 });
  }

  private async handleMessage(topic: string, payload: Buffer) {
    let parsed: any;
    try {
      parsed = JSON.parse(payload.toString());
    } catch {
      this.logger.warn(`Non-JSON MQTT payload on topic ${topic}`);
      return;
    }

    const uplink = await this.uplinkService.create({
      deviceEUI: parsed.deviceInfo?.devEui ?? '',
      gatewayEUI: parsed.rxInfo?.[0]?.gatewayId ?? '',
      rssi: parsed.rxInfo?.[0]?.rssi ?? 0,
      snr: parsed.rxInfo?.[0]?.snr ?? 0,
      frequency: parsed.txInfo?.frequency ?? 0,
      fPort: parsed.fPort ?? 0,
      fCnt: parsed.fCnt ?? 0,
      data: parsed.data ? Buffer.from(parsed.data, 'base64') : Buffer.alloc(0),
      decodedData: parsed.object ?? {},
      receivedAt: new Date(),
    });

    this.eventEmitter.emit('uplink.received', uplink);
  }
}
