import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Integration, IntegrationDocument } from './schemas/integration.schema';
import type { UplinkMessageDocument } from '../uplinks/schemas/uplink-message.schema';

@Injectable()
export class IntegrationDispatchService {
  private readonly logger = new Logger(IntegrationDispatchService.name);

  constructor(@InjectModel(Integration.name) private model: Model<IntegrationDocument>) {}

  @OnEvent('uplink.received')
  async handleUplink(uplink: UplinkMessageDocument) {
    const integrations = await this.model.find({ status: 'active', url: { $ne: '' } }).exec();
    await Promise.all(integrations.map((integration) => this.dispatch(integration, uplink)));
  }

  private async dispatch(integration: IntegrationDocument, uplink: UplinkMessageDocument) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (integration.apiKey) headers['Authorization'] = `Bearer ${integration.apiKey}`;

      const res = await fetch(integration.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(uplink.toObject()),
      });

      if (!res.ok) {
        this.logger.warn(`Integration "${integration.name}" responded ${res.status}`);
        return;
      }

      await this.model.updateOne(
        { _id: integration._id },
        { $inc: { events: 1 }, $set: { lastSync: new Date() } },
      ).exec();
    } catch (err: any) {
      this.logger.error(`Integration "${integration.name}" dispatch failed: ${err.message}`);
    }
  }
}
