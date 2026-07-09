import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Gateway, GatewayDocument } from './schemas/gateway.schema';
import { UplinkMessage } from '../uplinks/schemas/uplink-message.schema';
import { CreateGatewayDto } from './dto/create-gateway.dto';
import { UpdateGatewayDto } from './dto/update-gateway.dto';
import { EventsGateway } from '../websocket/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { companyFilter } from '../auth/company-scope.util';

@Injectable()
export class GatewaysService {
  constructor(
    @InjectModel(Gateway.name) private model: Model<GatewayDocument>,
    @InjectModel(UplinkMessage.name) private uplinkModel: Model<any>,
    private eventsGateway: EventsGateway,
    private notificationsService: NotificationsService,
  ) {}

  create(dto: CreateGatewayDto) {
    if (dto.eui) dto.eui = dto.eui.toUpperCase();
    return new this.model(dto).save();
  }

  async findAll(user: { role: string; companyId: string | null }) {
    const gateways = await this.model.find(companyFilter(user)).populate('companyId', 'name').lean().exec();

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

  async findOne(id: string, user: { role: string; companyId: string | null }) {
    const doc = await this.model.findOne({ _id: id, ...companyFilter(user) }).populate('companyId', 'name').lean().exec();
    if (!doc) throw new NotFoundException('Gateway not found');

    const [countRows, uptimeRows] = await Promise.all([
      this.uplinkModel.aggregate([
        { $match: { gatewayEUI: doc.eui } },
        { $group: { _id: null, count: { $addToSet: '$deviceEUI' } } },
        { $project: { count: { $size: '$count' } } },
      ]) as Promise<{ count: number }[]>,
      this.uplinkModel.aggregate([
        { $match: { gatewayEUI: doc.eui } },
        { $group: { _id: { $dateTrunc: { date: '$receivedAt', unit: 'hour' } }, }, },
        { $count: 'activeHours' },
      ]) as Promise<{ activeHours: number }[]>,
    ]);

    const devices = countRows[0]?.count ?? 0;
    const activeHours = uptimeRows[0]?.activeHours ?? 0;
    const firstSeen = (doc as any).createdAt ? new Date((doc as any).createdAt) : new Date();
    const totalHours = Math.max(1, Math.ceil((Date.now() - firstSeen.getTime()) / 3_600_000));
    const uptime = `${Math.min(100, Math.round((activeHours / totalHours) * 100))}%`;

    return { ...doc, devices, uptime };
  }
  async update(id: string, dto: UpdateGatewayDto, user: { role: string; companyId: string | null }) {
    const existing = await this.model.findById(id).exec();
    if (!existing) throw new NotFoundException('Gateway not found');
    if (user.role !== 'Super Admin' && existing.companyId?.toString() !== user.companyId) {
      throw new NotFoundException('Gateway not found');
    }
    if (dto.eui) dto.eui = dto.eui.toUpperCase();
    const doc = await this.model.findByIdAndUpdate(id, dto, { returnDocument: 'after' }).exec();
    if (!doc) throw new NotFoundException('Gateway not found');
    return doc;
  }
  async remove(id: string, user: { role: string; companyId: string | null }) {
    const existing = await this.model.findById(id).exec();
    if (!existing) throw new NotFoundException('Gateway not found');
    if (user.role !== 'Super Admin' && existing.companyId?.toString() !== user.companyId) {
      throw new NotFoundException('Gateway not found');
    }
    const doc = await this.model.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException('Gateway not found');
  }

  findByEui(eui: string) {
    return this.model.findOne({ eui }).exec();
  }

  async updateLocationFromStat(eui: string, lati: number, long: number, alti = 0): Promise<void> {
    await this.model.findOneAndUpdate(
      { eui },
      { latitude: lati, longitude: long, altitude: alti, locationType: 'inherited' },
      { returnDocument: 'after' },
    ).exec();
  }

  async markSeen(eui: string) {
    const existing = await this.model.findOne({ eui }).exec();
    if (!existing) return;

    const updated = await this.model.findOneAndUpdate(
      { eui },
      { status: 'online', lastSeen: new Date() },
      { returnDocument: 'after' },
    ).exec();

    if (existing.status === 'offline') {
      this.eventsGateway.emitGatewayStatus(updated);

      const notification = await this.notificationsService.create(
        'success',
        'Gateway Reconnected',
        `${existing.name} is back online`,
        existing.companyId?.toString() ?? null,
      );
      this.eventsGateway.emitNotification(notification);
    }
  }

  async markStaleOffline(thresholdMs: number) {
    const cutoff = new Date(Date.now() - thresholdMs);
    const staleGateways = await this.model.find({
      status: 'online',
      lastSeen: { $lt: cutoff },
    }).exec();

    if (staleGateways.length === 0) return;

    await this.model.updateMany(
      { status: 'online', lastSeen: { $lt: cutoff } },
      { status: 'offline' },
    ).exec();

    for (const gateway of staleGateways) {
      this.eventsGateway.emitGatewayStatus({ ...gateway.toObject(), status: 'offline' });

      const notification = await this.notificationsService.create(
        'warning',
        'Gateway Offline',
        `${gateway.name} has been offline since ${gateway.lastSeen?.toLocaleString() ?? 'unknown'}`,
        gateway.companyId?.toString() ?? null,
      );
      this.eventsGateway.emitNotification(notification);
    }
  }
}
