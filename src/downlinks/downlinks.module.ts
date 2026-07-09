import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DownlinksService } from './downlinks.service';
import { DownlinksController } from './downlinks.controller';
import { DownlinkMessage, DownlinkMessageSchema } from './schemas/downlink-message.schema';
import { EndDevice, EndDeviceSchema } from '../end-devices/schemas/end-device.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: DownlinkMessage.name, schema: DownlinkMessageSchema },
    { name: EndDevice.name, schema: EndDeviceSchema },
  ])],
  providers: [DownlinksService],
  controllers: [DownlinksController],
  exports: [DownlinksService],
})
export class DownlinksModule {}
