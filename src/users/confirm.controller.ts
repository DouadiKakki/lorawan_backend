import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';

@Controller('users')
export class ConfirmController {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  @Get('confirm')
  async confirm(@Query('token') token: string) {
    let payload: { sub: string; type: string };
    try {
      payload = await this.jwtService.verifyAsync(token, { secret: this.config.get('JWT_SECRET') });
    } catch {
      throw new BadRequestException('This confirmation link is invalid or has expired.');
    }
    if (payload.type !== 'email-confirm') {
      throw new BadRequestException('This confirmation link is invalid or has expired.');
    }
    await this.usersService.confirmEmail(payload.sub);
    return { message: 'Your account has been confirmed. You can now log in.' };
  }
}
