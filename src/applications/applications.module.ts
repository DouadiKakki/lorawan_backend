import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { Application, ApplicationSchema } from './schemas/application.schema';
import { EndDevice, EndDeviceSchema } from '../end-devices/schemas/end-device.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Application.name, schema: ApplicationSchema },
    { name: EndDevice.name, schema: EndDeviceSchema },
  ])],
  providers: [ApplicationsService],
  controllers: [ApplicationsController],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
