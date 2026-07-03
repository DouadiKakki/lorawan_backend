import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGatewayDto {
  @IsString() name: string;
  @IsString() eui: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() companyId?: string;
  @IsOptional() @IsEnum(['online', 'offline', 'warning']) status?: string;
  @IsOptional() @IsNumber() @Type(() => Number) latitude?: number;
  @IsOptional() @IsNumber() @Type(() => Number) longitude?: number;
  @IsOptional() @IsNumber() @Type(() => Number) altitude?: number;
  @IsOptional() @IsString() placement?: string;
  @IsOptional() @IsEnum(['manual', 'inherited']) locationType?: string;
  @IsOptional() @IsEnum(['chirpstack', 'kerlink']) protocol?: string;
}
