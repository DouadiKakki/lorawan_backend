import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EndDevicesService } from './end-devices.service';
import { EndDevicesController } from './end-devices.controller';
import { EndDevice, EndDeviceSchema } from './schemas/end-device.schema';
import { MqttModule } from '../mqtt/mqtt.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: EndDevice.name, schema: EndDeviceSchema }]),
    MqttModule,
  ],
  providers: [EndDevicesService],
  controllers: [EndDevicesController],
  exports: [EndDevicesService],
})
export class EndDevicesModule {}
