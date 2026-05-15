import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateGatewayDto {
  @IsString() name: string;
  @IsString() eui: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() companyId?: string;
  @IsOptional() @IsEnum(['online', 'offline', 'warning']) status?: string;
}
