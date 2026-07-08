import { IsEmail, IsMongoId, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsMongoId() companyId: string;
  @IsString() @MinLength(8) password: string;
}
