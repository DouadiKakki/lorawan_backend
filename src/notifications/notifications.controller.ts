import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get() @Roles('viewer') findAll() { return this.service.findAll(); }
  @Patch(':id/read') @Roles('viewer') markRead(@Param('id') id: string) { return this.service.markRead(id); }
  @Patch('read-all') @Roles('viewer') markAllRead() { return this.service.markAllRead(); }
}
