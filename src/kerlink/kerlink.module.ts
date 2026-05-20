import { Module } from '@nestjs/common';
import { KerlinkService } from './kerlink.service';
import { UplinkMessagesModule } from '../uplinks/uplinks.module';
import { EndDevicesModule } from '../end-devices/end-devices.module';

@Module({
  imports: [UplinkMessagesModule, EndDevicesModule],
  providers: [KerlinkService],
})
export class KerlinkModule {}
