import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { Company, CompanySchema } from './schemas/company.schema';
import { Gateway, GatewaySchema } from '../gateways/schemas/gateway.schema';
import { EndDevice, EndDeviceSchema } from '../end-devices/schemas/end-device.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Company.name, schema: CompanySchema },
    { name: Gateway.name, schema: GatewaySchema },
    { name: EndDevice.name, schema: EndDeviceSchema },
  ])],
  providers: [CompaniesService],
  controllers: [CompaniesController],
  exports: [CompaniesService],
})
export class CompaniesModule {}
