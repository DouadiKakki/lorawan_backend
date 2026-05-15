import { PartialType } from '@nestjs/mapped-types';
import { CreateEndDeviceDto } from './create-end-device.dto';
export class UpdateEndDeviceDto extends PartialType(CreateEndDeviceDto) {}
