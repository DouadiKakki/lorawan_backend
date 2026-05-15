import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { EndDevicesService } from './end-devices.service';
import { CreateEndDeviceDto } from './dto/create-end-device.dto';
import { UpdateEndDeviceDto } from './dto/update-end-device.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('end-devices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EndDevicesController {
  constructor(private readonly service: EndDevicesService) {}

  @Get() @Roles('viewer') findAll() { return this.service.findAll(); }
  @Get(':id') @Roles('viewer') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() @Roles('operator') create(@Body() dto: CreateEndDeviceDto) { return this.service.create(dto); }
  @Put(':id') @Roles('operator') update(@Param('id') id: string, @Body() dto: UpdateEndDeviceDto) { return this.service.update(id, dto); }
  @Delete(':id') @Roles('admin') remove(@Param('id') id: string) { return this.service.remove(id); }
}
