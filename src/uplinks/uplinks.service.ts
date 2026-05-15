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

  async findAll(page = 1, limit = 50, deviceEUI?: string, applicationId?: string) {
    const filter: any = {};
    if (deviceEUI) filter.deviceEUI = deviceEUI;
    if (applicationId) filter.applicationId = applicationId;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ receivedAt: -1 }).skip(skip).limit(limit).exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data, total, page, limit };
  }

  async findLatestByDevice(deviceEUI: string): Promise<UplinkMessageDocument | null> {
    return this.model.findOne({ deviceEUI }).sort({ receivedAt: -1 }).exec();
  }
}
