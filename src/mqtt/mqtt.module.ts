import { Module } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { UplinkMessagesModule } from '../uplinks/uplinks.module';

@Module({
  imports: [UplinkMessagesModule],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
