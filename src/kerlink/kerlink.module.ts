import { Module, forwardRef } from '@nestjs/common';
import { KerlinkService } from './kerlink.service';
import { KerlinkDownlinkService } from './kerlink-downlink.service';
import { UplinkMessagesModule } from '../uplinks/uplinks.module';
import { EndDevicesModule } from '../end-devices/end-devices.module';
import { GatewaysModule } from '../gateways/gateways.module';

@Module({
  imports: [UplinkMessagesModule, forwardRef(() => EndDevicesModule), GatewaysModule],
  providers: [KerlinkService, KerlinkDownlinkService],
  exports: [KerlinkDownlinkService],
})
export class KerlinkModule {}
