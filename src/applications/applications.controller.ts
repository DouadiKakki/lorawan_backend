import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
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

  @Get() @Roles('viewer') findAll() { return this.service.findAll(); }
  @Get(':id') @Roles('viewer') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() @Roles('operator') create(@Body() dto: CreateApplicationDto) { return this.service.create(dto); }
  @Put(':id') @Roles('operator') update(@Param('id') id: string, @Body() dto: UpdateApplicationDto) { return this.service.update(id, dto); }
  @Delete(':id') @Roles('admin') remove(@Param('id') id: string) { return this.service.remove(id); }
}
