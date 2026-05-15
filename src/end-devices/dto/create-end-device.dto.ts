import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateEndDeviceDto {
  @IsString() name: string;
  @IsString() devEUI: string;
  @IsOptional() @IsString() applicationId?: string;
  @IsOptional() @IsString() companyId?: string;
  @IsOptional() @IsEnum(['active', 'inactive']) status?: string;
  @IsOptional() @IsNumber() battery?: number;
}
