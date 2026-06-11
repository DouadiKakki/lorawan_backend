import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateEndDeviceDto {
  @IsString() name: string;
  @IsString() devEUI: string;
  @IsOptional() @IsString() applicationId?: string;
  @IsOptional() @IsString() companyId?: string;
  @IsOptional() @IsEnum(['active', 'inactive']) status?: string;
  @IsOptional() @IsNumber() battery?: number;
  @IsOptional() @IsString() devAddr?: string;
  @IsOptional() @IsString() appSKey?: string;
  @IsOptional() @IsString() nwkSKey?: string;
  @IsOptional() @IsString() joinEUI?: string;
  @IsOptional() @IsString() appKey?: string;
  @IsOptional() @IsString() nwkKey?: string;
  @IsOptional() @IsString() fNwkSIntKey?: string;
  @IsOptional() @IsString() sNwkSIntKey?: string;
  @IsOptional() @IsString() nwkSEncKey?: string;
  @IsOptional() @IsString() frequencyPlan?: string;
  @IsOptional() @IsString() lorawanVersion?: string;
  @IsOptional() @IsString() regionalParametersVersion?: string;
  @IsOptional() @IsBoolean() supportsClassB?: boolean;
  @IsOptional() @IsBoolean() supportsClassC?: boolean;
  @IsOptional() @IsEnum(['OTAA', 'ABP', 'Multicast']) activationMode?: string;
  @IsOptional() @IsBoolean() resetsJoinNonces?: boolean;
}
