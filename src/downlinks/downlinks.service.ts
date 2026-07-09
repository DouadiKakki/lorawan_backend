import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DownlinkMessage, DownlinkMessageDocument } from './schemas/downlink-message.schema';
import { EndDevice, EndDeviceDocument } from '../end-devices/schemas/end-device.schema';
import { companyFilter } from '../auth/company-scope.util';

@Injectable()
export class DownlinksService {
  constructor(
    @InjectModel(DownlinkMessage.name) private model: Model<DownlinkMessageDocument>,
    @InjectModel(EndDevice.name) private deviceModel: Model<EndDeviceDocument>,
  ) {}

  async create(data: Partial<DownlinkMessage>): Promise<DownlinkMessageDocument> {
    return new this.model(data).save();
  }

  async findAll(user: { role: string; companyId: string | null }, page = 1, limit = 50, deviceEUI?: string) {
    const filter: any = {};
    if (deviceEUI) {
      filter.deviceEUI = deviceEUI;
    } else if (user.role !== 'Super Admin') {
      const deviceEUIs = await this.deviceModel.find(companyFilter(user)).distinct('devEUI').exec();
      filter.deviceEUI = { $in: deviceEUIs };
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ sentAt: -1 }).skip(skip).limit(limit).exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data, total, page, limit };
  }
}
