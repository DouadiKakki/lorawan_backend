import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EndDevicesService } from './end-devices.service';
import { EndDevicesController } from './end-devices.controller';
import { EndDevice, EndDeviceSchema } from './schemas/end-device.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: EndDevice.name, schema: EndDeviceSchema }])],
  providers: [EndDevicesService],
  controllers: [EndDevicesController],
  exports: [EndDevicesService],
})
export class EndDevicesModule {}
