import { IsEnum, IsString } from 'class-validator';

export class CreateNotificationDto {
  @IsEnum(['warning', 'success', 'info']) type: string;
  @IsString() title: string;
  @IsString() message: string;
}
