import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateApplicationDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() companyId?: string;
  @IsOptional() @IsEnum(['active', 'inactive']) status?: string;
}
