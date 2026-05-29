import { Controller, Get, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('config')
@UseGuards(JwtAuthGuard)
export class ConfigController {
  constructor(private readonly config: ConfigService) {}

  @Get('maps')
  getMapsConfig() {
    return { apiKey: this.config.get<string>('GOOGLE_MAPS_API_KEY') };
  }
}
