import { Controller, Get, Post, Put, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('applications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApplicationsController {
  constructor(private readonly service: ApplicationsService) {}

  @Get() @Roles('viewer') findAll(@Req() req: any) { return this.service.findAll(req.user); }
  @Get(':id') @Roles('viewer') findOne(@Param('id') id: string, @Req() req: any) { return this.service.findOne(id, req.user); }
  @Post() @Roles('operator') create(@Body() dto: CreateApplicationDto) { return this.service.create(dto); }
  @Put(':id') @Roles('operator') update(@Param('id') id: string, @Body() dto: UpdateApplicationDto, @Req() req: any) { return this.service.update(id, dto, req.user); }
  @Delete(':id') @Roles('admin') remove(@Param('id') id: string, @Req() req: any) { return this.service.remove(id, req.user); }
}
