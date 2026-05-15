import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { GatewaysService } from './gateways.service';
import { CreateGatewayDto } from './dto/create-gateway.dto';
import { UpdateGatewayDto } from './dto/update-gateway.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('gateways')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GatewaysController {
  constructor(private readonly service: GatewaysService) {}

  @Get() @Roles('viewer') findAll() { return this.service.findAll(); }
  @Get(':id') @Roles('viewer') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() @Roles('operator') create(@Body() dto: CreateGatewayDto) { return this.service.create(dto); }
  @Put(':id') @Roles('operator') update(@Param('id') id: string, @Body() dto: UpdateGatewayDto) { return this.service.update(id, dto); }
  @Delete(':id') @Roles('admin') remove(@Param('id') id: string) { return this.service.remove(id); }
}
