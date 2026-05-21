import { Module } from '@nestjs/common';
import { KerlinkService } from './kerlink.service';
import { UplinkMessagesModule } from '../uplinks/uplinks.module';
import { EndDevicesModule } from '../end-devices/end-devices.module';
import { GatewaysModule } from '../gateways/gateways.module';

@Module({
  imports: [UplinkMessagesModule, EndDevicesModule, GatewaysModule],
  providers: [KerlinkService],
})
export class KerlinkModule {}
