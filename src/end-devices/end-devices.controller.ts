import { Controller, Get, Post, Put, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
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

  @Get() @Roles('viewer') findAll(@Req() req: any) { return this.service.findAll(req.user); }
  @Get(':id') @Roles('viewer') findOne(@Param('id') id: string, @Req() req: any) { return this.service.findOne(id, req.user); }
  @Post() @Roles('operator') create(@Body() dto: CreateEndDeviceDto) { return this.service.create(dto); }
  @Put(':id') @Roles('operator') update(@Param('id') id: string, @Body() dto: UpdateEndDeviceDto, @Req() req: any) { return this.service.update(id, dto, req.user); }
  @Delete(':id') @Roles('admin') remove(@Param('id') id: string, @Req() req: any) { return this.service.remove(id, req.user); }
  @Put(':id/deactivate') @Roles('operator') deactivate(@Param('id') id: string, @Req() req: any) { return this.service.deactivate(id, req.user); }
  @Put(':id/activate') @Roles('operator') activate(@Param('id') id: string, @Req() req: any) { return this.service.activate(id, req.user); }
  @Post(':id/downlink') @Roles('operator') sendDownlink(@Param('id') id: string, @Body() dto: SendDownlinkDto, @Req() req: any) { return this.service.sendDownlink(id, dto, req.user); }
  @Put(':id/share') @Roles('operator') updateShare(@Param('id') id: string, @Body() dto: UpdateShareDto, @Req() req: any) { return this.service.updateShare(id, dto, req.user); }
}
