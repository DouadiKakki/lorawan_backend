import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Integration, IntegrationDocument } from './schemas/integration.schema';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';

@Injectable()
export class IntegrationsService {
  constructor(@InjectModel(Integration.name) private model: Model<IntegrationDocument>) {}

  create(dto: CreateIntegrationDto) { return new this.model(dto).save(); }
  findAll() { return this.model.find().exec(); }
  async update(id: string, dto: UpdateIntegrationDto) {
    const doc = await this.model.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!doc) throw new NotFoundException('Integration not found');
    return doc;
  }
  async remove(id: string) {
    const doc = await this.model.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException('Integration not found');
  }
}
