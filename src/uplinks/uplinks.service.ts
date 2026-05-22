import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UplinkMessage, UplinkMessageDocument } from './schemas/uplink-message.schema';

@Injectable()
export class UplinkMessagesService {
  constructor(@InjectModel(UplinkMessage.name) private model: Model<UplinkMessageDocument>) {}

  async create(data: Partial<UplinkMessage>): Promise<UplinkMessageDocument> {
    return new this.model(data).save();
  }

  private toHex(buf: any): string {
    if (!buf) return '';
    // Node Buffer
    if (Buffer.isBuffer(buf))
      return buf.toString('hex').toUpperCase().replace(/.{2}/g, '$& ').trim();
    // BSON Binary (mongoose toObject keeps it as Binary)
    if (typeof buf.toString === 'function' && buf.buffer instanceof Uint8Array)
      return Buffer.from(buf.buffer).toString('hex').toUpperCase().replace(/.{2}/g, '$& ').trim();
    // Plain {type:'Buffer',data:[...]} from JSON round-trip
    if (buf?.type === 'Buffer' && Array.isArray(buf.data))
      return Buffer.from(buf.data).toString('hex').toUpperCase().replace(/.{2}/g, '$& ').trim();
    return '';
  }

  private serialize(doc: UplinkMessageDocument) {
    const obj = doc.toObject({ virtuals: false });
    const dataHex = this.toHex(obj.data);
    const { data: _data, ...rest } = obj as any;
    return { ...rest, dataHex: dataHex || undefined };
  }

  async findAll(page = 1, limit = 50, deviceEUI?: string, applicationId?: string, gatewayEUI?: string) {
    const filter: any = {};
    if (deviceEUI) filter.deviceEUI = deviceEUI;
    if (applicationId) filter.applicationId = applicationId;
    if (gatewayEUI) filter.gatewayEUI = gatewayEUI;
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.model.find(filter).sort({ receivedAt: -1 }).skip(skip).limit(limit).exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data: docs.map(d => this.serialize(d)), total, page, limit };
  }

  async findLatestByDevice(deviceEUI: string) {
    const doc = await this.model.findOne({ deviceEUI }).sort({ receivedAt: -1 }).exec();
    return doc ? this.serialize(doc) : null;
  }

  async statsHourly(): Promise<{ time: string; uplinks: number }[]> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const raw = await this.model.aggregate([
      { $match: { receivedAt: { $gte: since } } },
      {
        $group: {
          _id: { $hour: '$receivedAt' },
          uplinks: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    // fill all 24 hours
    const map = new Map(raw.map((r: any) => [r._id, r.uplinks]));
    return Array.from({ length: 24 }, (_, h) => ({
      time: `${String(h).padStart(2, '0')}:00`,
      uplinks: (map.get(h) as number) ?? 0,
    }));
  }

  async statsGateway(): Promise<{ name: string; packets: number }[]> {
    const raw = await this.model.aggregate([
      {
        $group: {
          _id: '$gatewayEUI',
          packets: { $sum: 1 },
        },
      },
      { $sort: { packets: -1 } },
      { $limit: 10 },
    ]);
    return raw.map((r: any) => ({ name: r._id, packets: r.packets }));
  }

  async statsSummary(): Promise<{ total: number; last24h: number; deviceCount: number; gatewayCount: number }> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [total, last24h, deviceCount, gatewayCount] = await Promise.all([
      this.model.countDocuments().exec(),
      this.model.countDocuments({ receivedAt: { $gte: since } }).exec(),
      this.model.distinct('deviceEUI').then((d: string[]) => d.length),
      this.model.distinct('gatewayEUI').then((g: string[]) => g.length),
    ]);
    return { total, last24h, deviceCount, gatewayCount };
  }
}
