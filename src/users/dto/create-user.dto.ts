import { IsEmail, IsEnum, IsMongoId, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsMongoId() @IsOptional() companyId?: string;
  @IsString() @MinLength(8) password: string;
  @IsEnum(['admin', 'operator', 'viewer', 'Super Admin']) role: string;
}
