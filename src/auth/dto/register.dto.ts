import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsString() @IsOptional() company?: string;
  @IsString() @MinLength(8) password: string;
}
