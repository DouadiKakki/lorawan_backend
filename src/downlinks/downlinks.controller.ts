import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { DownlinksService } from './downlinks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('downlinks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DownlinksController {
  constructor(private readonly service: DownlinksService) {}

  @Get()
  @Roles('viewer')
  findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('deviceEUI') deviceEUI?: string,
  ) {
    return this.service.findAll(
      req.user,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
      deviceEUI,
    );
  }
}
