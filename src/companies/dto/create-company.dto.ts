import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateCompanyDto {
  @IsString() name: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsEnum(['active', 'inactive']) status?: string;
}
