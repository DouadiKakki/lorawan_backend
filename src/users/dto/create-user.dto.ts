import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsString() @IsOptional() company?: string;
  @IsString() @MinLength(8) password: string;
  @IsEnum(['admin', 'operator', 'viewer']) role: string;
}
