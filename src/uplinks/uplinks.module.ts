import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UplinkMessagesService } from './uplinks.service';
import { UplinkMessagesController } from './uplinks.controller';
import { UplinkMessage, UplinkMessageSchema } from './schemas/uplink-message.schema';
import { Application, ApplicationSchema } from '../applications/schemas/application.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: UplinkMessage.name, schema: UplinkMessageSchema },
    { name: Application.name, schema: ApplicationSchema },
  ])],
  providers: [UplinkMessagesService],
  controllers: [UplinkMessagesController],
  exports: [UplinkMessagesService],
})
export class UplinkMessagesModule {}
