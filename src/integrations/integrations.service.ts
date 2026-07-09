import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Integration, IntegrationDocument } from './schemas/integration.schema';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { companyFilter } from '../auth/company-scope.util';

@Injectable()
export class IntegrationsService {
  constructor(@InjectModel(Integration.name) private model: Model<IntegrationDocument>) {}

  create(dto: CreateIntegrationDto) { return new this.model(dto).save(); }
  findAll(user: { role: string; companyId: string | null }) { return this.model.find(companyFilter(user)).exec(); }
  async update(id: string, dto: UpdateIntegrationDto, user: { role: string; companyId: string | null }) {
    const existing = await this.model.findById(id).exec();
    if (!existing) throw new NotFoundException('Integration not found');
    if (user.role !== 'Super Admin' && existing.companyId?.toString() !== user.companyId) {
      throw new NotFoundException('Integration not found');
    }
    const doc = await this.model.findByIdAndUpdate(id, dto, { returnDocument: 'after' }).exec();
    return doc;
  }
  async remove(id: string, user: { role: string; companyId: string | null }) {
    const existing = await this.model.findById(id).exec();
    if (!existing) throw new NotFoundException('Integration not found');
    if (user.role !== 'Super Admin' && existing.companyId?.toString() !== user.companyId) {
      throw new NotFoundException('Integration not found');
    }
    await this.model.findByIdAndDelete(id).exec();
  }
}
