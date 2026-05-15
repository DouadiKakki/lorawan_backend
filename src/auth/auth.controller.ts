import { Controller, Post, Body, UseGuards, Req, HttpCode } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) { return this.authService.login(dto); }

  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(200)
  refresh(@Req() req: any) { return this.authService.refresh(req.user); }

  @Post('logout')
  @HttpCode(200)
  logout() { return { message: 'Logged out' }; }
}
