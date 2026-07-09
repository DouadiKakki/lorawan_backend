import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { BulkUserIdsDto } from './dto/bulk-user-ids.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin', 'operator')
  findAll(@Req() req: any) { return this.usersService.findAll(req.user); }

  @Post('bulk-delete')
  @Roles('admin')
  bulkDelete(@Body() dto: BulkUserIdsDto, @Req() req: any) { return this.usersService.bulkDelete(dto.ids, req.user); }

  @Post('bulk-deactivate')
  @Roles('admin')
  bulkDeactivate(@Body() dto: BulkUserIdsDto, @Req() req: any) { return this.usersService.bulkDeactivate(dto.ids, req.user); }

  @Post('bulk-reset-password')
  @Roles('admin')
  bulkResetPassword(@Body() dto: BulkUserIdsDto, @Req() req: any) { return this.usersService.bulkResetPassword(dto.ids, req.user); }

  @Get(':id')
  @Roles('admin', 'operator')
  findOne(@Param('id') id: string, @Req() req: any) { return this.usersService.findOne(id, req.user); }

  @Post()
  @Roles('admin')
  create(@Body() dto: CreateUserDto) { return this.usersService.create(dto); }

  @Put(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: any) { return this.usersService.update(id, dto, req.user); }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string, @Req() req: any) { return this.usersService.remove(id, req.user); }
}
