import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Gateway, GatewayDocument } from './schemas/gateway.schema';
import { UplinkMessage } from '../uplinks/schemas/uplink-message.schema';
import { CreateGatewayDto } from './dto/create-gateway.dto';
import { UpdateGatewayDto } from './dto/update-gateway.dto';

@Injectable()
export class GatewaysService {
  constructor(
    @InjectModel(Gateway.name) private model: Model<GatewayDocument>,
    @InjectModel(UplinkMessage.name) private uplinkModel: Model<any>,
  ) {}

  create(dto: CreateGatewayDto) { return new this.model(dto).save(); }

  async findAll() {
    const gateways = await this.model.find().populate('companyId', 'name').lean().exec();

    const [counts, uptimeRows] = await Promise.all([
      this.uplinkModel.aggregate([
        { $group: { _id: '$gatewayEUI', count: { $addToSet: '$deviceEUI' } } },
        { $project: { _id: 1, count: { $size: '$count' } } },
      ]) as Promise<{ _id: string; count: number }[]>,
      this.uplinkModel.aggregate([
        { $group: { _id: { eui: '$gatewayEUI', hour: { $dateTrunc: { date: '$receivedAt', unit: 'hour' } } } } },
        { $group: { _id: '$_id.eui', activeHours: { $sum: 1 }, earliest: { $min: '$_id.hour' } } },
      ]) as Promise<{ _id: string; activeHours: number; earliest: Date }[]>,
    ]);

    const countMap = new Map(counts.map(c => [c._id, c.count]));
    const uptimeMap = new Map(uptimeRows.map(r => [r._id, r]));

    return gateways.map(g => {
      const ut = uptimeMap.get(g.eui);
      let uptime = '0%';
      if (ut) {
        const firstSeen = (g as any).createdAt ? new Date((g as any).createdAt) : ut.earliest;
        const totalHours = Math.max(1, Math.ceil((Date.now() - firstSeen.getTime()) / 3_600_000));
        uptime = `${Math.min(100, Math.round((ut.activeHours / totalHours) * 100))}%`;
      }
      return { ...g, devices: countMap.get(g.eui) ?? 0, uptime };
    });
  }

  async findOne(id: string) {
    const doc = await this.model.findById(id).populate('companyId', 'name').exec();
    if (!doc) throw new NotFoundException('Gateway not found');
    return doc;
  }
  async update(id: string, dto: UpdateGatewayDto) {
    const doc = await this.model.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!doc) throw new NotFoundException('Gateway not found');
    return doc;
  }
  async remove(id: string) {
    const doc = await this.model.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException('Gateway not found');
  }

  async markSeen(eui: string) {
    await this.model.findOneAndUpdate(
      { eui },
      { status: 'online', lastSeen: new Date() },
    ).exec();
  }

  async markStaleOffline(thresholdMs: number) {
    const cutoff = new Date(Date.now() - thresholdMs);
    await this.model.updateMany(
      { status: 'online', lastSeen: { $lt: cutoff } },
      { status: 'offline' },
    ).exec();
  }
}
