import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EndDevicesService } from './end-devices.service';
import { EndDevicesController } from './end-devices.controller';
import { EndDevice, EndDeviceSchema } from './schemas/end-device.schema';
import { MqttModule } from '../mqtt/mqtt.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: EndDevice.name, schema: EndDeviceSchema }]),
    MqttModule,
    WebsocketModule,
  ],
  providers: [EndDevicesService],
  controllers: [EndDevicesController],
  exports: [EndDevicesService],
})
export class EndDevicesModule {}
