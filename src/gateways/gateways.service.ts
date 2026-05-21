import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Gateway, GatewayDocument } from './schemas/gateway.schema';
import { CreateGatewayDto } from './dto/create-gateway.dto';
import { UpdateGatewayDto } from './dto/update-gateway.dto';

@Injectable()
export class GatewaysService {
  constructor(@InjectModel(Gateway.name) private model: Model<GatewayDocument>) {}

  create(dto: CreateGatewayDto) { return new this.model(dto).save(); }
  findAll() { return this.model.find().exec(); }
  async findOne(id: string) {
    const doc = await this.model.findById(id).exec();
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
