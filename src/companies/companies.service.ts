import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company, CompanyDocument } from './schemas/company.schema';
import { Gateway } from '../gateways/schemas/gateway.schema';
import { EndDevice } from '../end-devices/schemas/end-device.schema';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(Company.name) private model: Model<CompanyDocument>,
    @InjectModel(Gateway.name) private gatewayModel: Model<any>,
    @InjectModel(EndDevice.name) private deviceModel: Model<any>,
  ) {}

  create(dto: CreateCompanyDto) { return new this.model(dto).save(); }

  findAllPublic() {
    return this.model.find({ status: 'active' }).select('_id name').exec();
  }

  async findAll() {
    const companies = await this.model.find().lean().exec();
    const [gatewayCounts, deviceCounts] = await Promise.all([
      this.gatewayModel.aggregate([
        { $match: { companyId: { $exists: true, $ne: null } } },
        { $group: { _id: { $toString: '$companyId' }, count: { $sum: 1 } } },
      ]) as Promise<{ _id: string; count: number }[]>,
      this.deviceModel.aggregate([
        { $match: { companyId: { $exists: true, $ne: null } } },
        { $group: { _id: { $toString: '$companyId' }, count: { $sum: 1 } } },
      ]) as Promise<{ _id: string; count: number }[]>,
    ]);
    const gwMap = new Map(gatewayCounts.map(c => [c._id, c.count]));
    const devMap = new Map(deviceCounts.map(c => [c._id, c.count]));
    return companies.map(c => ({
      ...c,
      gateways: gwMap.get(String(c._id)) ?? 0,
      devices: devMap.get(String(c._id)) ?? 0,
    }));
  }
  async findOne(id: string) {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Company not found');
    return doc;
  }
  async update(id: string, dto: UpdateCompanyDto) {
    const doc = await this.model.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!doc) throw new NotFoundException('Company not found');
    return doc;
  }
  async remove(id: string) {
    const doc = await this.model.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException('Company not found');
  }
}
