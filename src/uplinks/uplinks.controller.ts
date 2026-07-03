import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { UplinkMessagesService } from './uplinks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('uplinks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UplinkMessagesController {
  constructor(private readonly service: UplinkMessagesService) {}

  @Get('stats/hourly')
  @Roles('viewer')
  statsHourly() {
    return this.service.statsHourly();
  }

  @Get('stats/gateway')
  @Roles('viewer')
  statsGateway() {
    return this.service.statsGateway();
  }

  @Get('stats/summary')
  @Roles('viewer')
  statsSummary() {
    return this.service.statsSummary();
  }

  @Get('stats/interval')
  @Roles('viewer')
  statsInterval() {
    return this.service.statsInterval();
  }

  @Get()
  @Roles('viewer')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('deviceEUI') deviceEUI?: string,
    @Query('applicationId') applicationId?: string,
    @Query('gatewayEUI') gatewayEUI?: string,
  ) {
    return this.service.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
      deviceEUI,
      applicationId,
      gatewayEUI,
    );
  }

  @Get(':deviceEUI/latest')
  @Roles('viewer')
  findLatest(@Param('deviceEUI') deviceEUI: string) {
    return this.service.findLatestByDevice(deviceEUI);
  }
}
