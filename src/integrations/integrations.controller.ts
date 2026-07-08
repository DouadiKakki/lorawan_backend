import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IntegrationsController {
  constructor(private readonly service: IntegrationsService) {}

  @Get() @Roles('viewer') findAll(@Req() req: any) { return this.service.findAll(req.user); }
  @Post() @Roles('admin') create(@Body() dto: CreateIntegrationDto) { return this.service.create(dto); }
  @Put(':id') @Roles('admin') update(@Param('id') id: string, @Body() dto: UpdateIntegrationDto, @Req() req: any) { return this.service.update(id, dto, req.user); }
  @Delete(':id') @Roles('admin') remove(@Param('id') id: string, @Req() req: any) { return this.service.remove(id, req.user); }
}
