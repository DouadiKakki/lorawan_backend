import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UplinkMessagesService } from './uplinks.service';
import { UplinkMessagesController } from './uplinks.controller';
import { UplinkMessage, UplinkMessageSchema } from './schemas/uplink-message.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: UplinkMessage.name, schema: UplinkMessageSchema }])],
  providers: [UplinkMessagesService],
  controllers: [UplinkMessagesController],
  exports: [UplinkMessagesService],
})
export class UplinkMessagesModule {}
