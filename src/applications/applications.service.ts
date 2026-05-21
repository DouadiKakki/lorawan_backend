import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Application, ApplicationDocument } from './schemas/application.schema';
import { EndDevice } from '../end-devices/schemas/end-device.schema';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectModel(Application.name) private model: Model<ApplicationDocument>,
    @InjectModel(EndDevice.name) private deviceModel: Model<any>,
  ) {}

  create(dto: CreateApplicationDto) { return new this.model(dto).save(); }

  async findAll() {
    const apps = await this.model.find().lean().exec();
    const counts: { _id: string; count: number }[] = await this.deviceModel.aggregate([
      { $match: { applicationId: { $exists: true, $ne: null } } },
      { $group: { _id: { $toString: '$applicationId' }, count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map(c => [c._id, c.count]));
    return apps.map(a => ({ ...a, devices: countMap.get(String(a._id)) ?? 0 }));
  }
  async findOne(id: string) {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Application not found');
    return doc;
  }
  async update(id: string, dto: UpdateApplicationDto) {
    const doc = await this.model.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!doc) throw new NotFoundException('Application not found');
    return doc;
  }
  async remove(id: string) {
    const doc = await this.model.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException('Application not found');
  }
}
