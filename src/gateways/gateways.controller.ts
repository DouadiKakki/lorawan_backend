import { Controller, Get, Post, Put, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
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

  @Get() @Roles('viewer') findAll(@Req() req: any) { return this.service.findAll(req.user); }
  @Get(':id') @Roles('viewer') findOne(@Param('id') id: string, @Req() req: any) { return this.service.findOne(id, req.user); }
  @Post() @Roles('operator') create(@Body() dto: CreateGatewayDto) { return this.service.create(dto); }
  @Put(':id') @Roles('operator') update(@Param('id') id: string, @Body() dto: UpdateGatewayDto, @Req() req: any) { return this.service.update(id, dto, req.user); }
  @Delete(':id') @Roles('admin') remove(@Param('id') id: string, @Req() req: any) { return this.service.remove(id, req.user); }
}
