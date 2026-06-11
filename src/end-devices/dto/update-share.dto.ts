import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IsString, IsEnum, IsObject } from 'class-validator';

class CollaboratorDto {
  @IsString() userId: string;
  @IsEnum(['full', 'custom']) permission: string;
  @IsOptional() @IsObject() customPermissions?: Record<string, boolean>;
  @IsString() addedDate: string;
}

class SharedCompanyDto {
  @IsString() companyId: string;
  @IsEnum(['full', 'custom']) permission: string;
  @IsOptional() @IsObject() customPermissions?: Record<string, boolean>;
  @IsString() addedDate: string;
}

export class UpdateShareDto {
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CollaboratorDto)
  collaborators?: CollaboratorDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SharedCompanyDto)
  sharedCompanies?: SharedCompanyDto[];
}
