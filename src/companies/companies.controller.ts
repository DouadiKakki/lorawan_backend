import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompaniesController {
  constructor(private readonly service: CompaniesService) {}

  @Get() @Roles('viewer') findAll() { return this.service.findAll(); }
  @Get(':id') @Roles('viewer') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() @Roles('admin') create(@Body() dto: CreateCompanyDto) { return this.service.create(dto); }
  @Put(':id') @Roles('admin') update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) { return this.service.update(id, dto); }
  @Delete(':id') @Roles('admin') remove(@Param('id') id: string) { return this.service.remove(id); }
}
