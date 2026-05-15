import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateIntegrationDto {
  @IsString() name: string;
  @IsEnum(['Cloud', 'Webhook', 'Protocol', 'API', 'Database', 'Visualization', 'Notification', 'Automation']) type: string;
  @IsOptional() @IsEnum(['active', 'inactive']) status?: string;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() apiKey?: string;
}
