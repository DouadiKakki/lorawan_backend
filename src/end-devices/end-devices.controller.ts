import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { EndDevicesService } from './end-devices.service';
import { CreateEndDeviceDto } from './dto/create-end-device.dto';
import { UpdateEndDeviceDto } from './dto/update-end-device.dto';
import { SendDownlinkDto } from './dto/send-downlink.dto';
import { UpdateShareDto } from './dto/update-share.dto';
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
  @Put(':id/deactivate') @Roles('operator') deactivate(@Param('id') id: string) { return this.service.deactivate(id); }
  @Put(':id/activate') @Roles('operator') activate(@Param('id') id: string) { return this.service.activate(id); }
  @Post(':id/downlink') @Roles('operator') sendDownlink(@Param('id') id: string, @Body() dto: SendDownlinkDto) { return this.service.sendDownlink(id, dto); }
  @Put(':id/share') @Roles('operator') updateShare(@Param('id') id: string, @Body() dto: UpdateShareDto) { return this.service.updateShare(id, dto); }
}
