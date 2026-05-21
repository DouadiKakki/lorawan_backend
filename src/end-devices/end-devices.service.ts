import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EndDevice, EndDeviceDocument } from './schemas/end-device.schema';
import { CreateEndDeviceDto } from './dto/create-end-device.dto';
import { UpdateEndDeviceDto } from './dto/update-end-device.dto';

@Injectable()
export class EndDevicesService {
  constructor(@InjectModel(EndDevice.name) private model: Model<EndDeviceDocument>) {}

  create(dto: CreateEndDeviceDto) { return new this.model(dto).save(); }
  findAll() { return this.model.find().populate('applicationId', 'name').populate('companyId', 'name').exec(); }
  async findOne(id: string) {
    const doc = await this.model.findById(id).populate('applicationId', 'name').populate('companyId', 'name').exec();
    if (!doc) throw new NotFoundException('End device not found');
    return doc;
  }
  async update(id: string, dto: UpdateEndDeviceDto) {
    if (dto.devAddr) dto.devAddr = dto.devAddr.toLowerCase();
    const doc = await this.model.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!doc) throw new NotFoundException('End device not found');
    return doc;
  }
  async remove(id: string) {
    const doc = await this.model.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException('End device not found');
  }

  findByDevAddr(devAddr: string): Promise<EndDeviceDocument | null> {
    return this.model.findOne({ devAddr: devAddr.toLowerCase() }).exec();
  }

  async markSeen(devAddr: string, gatewayEUI: string, rssi: number) {
    await this.model.findOneAndUpdate(
      { devAddr: devAddr.toLowerCase() },
      { $pull: { connectedGateways: { gatewayEUI } } },
    ).exec();
    await this.model.findOneAndUpdate(
      { devAddr: devAddr.toLowerCase() },
      {
        lastSeen: new Date(),
        rssi,
        status: 'active',
        $push: { connectedGateways: { gatewayEUI, rssi } },
      },
    ).exec();
  }
}
