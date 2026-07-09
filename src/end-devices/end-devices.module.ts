import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EndDevicesService } from './end-devices.service';
import { EndDevicesController } from './end-devices.controller';
import { EndDevice, EndDeviceSchema } from './schemas/end-device.schema';
import { MqttModule } from '../mqtt/mqtt.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { KerlinkModule } from '../kerlink/kerlink.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DownlinksModule } from '../downlinks/downlinks.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: EndDevice.name, schema: EndDeviceSchema }]),
    MqttModule,
    WebsocketModule,
    GatewaysModule,
    forwardRef(() => KerlinkModule),
    NotificationsModule,
    DownlinksModule,
  ],
  providers: [EndDevicesService],
  controllers: [EndDevicesController],
  exports: [EndDevicesService],
})
export class EndDevicesModule {}
