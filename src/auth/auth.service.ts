import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      companyId: dto.companyId,
      password: dto.password,
      role: 'viewer',
    });
    return this.generateTokens({ sub: user._id.toString(), email: user.email, role: user.role, companyId: user.companyId?.toString() ?? null });
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    if (user.status !== 'active') throw new UnauthorizedException('Please confirm your email before logging in.');
    await this.usersService.updateLastLogin(user._id.toString());
    return this.generateTokens({ sub: user._id.toString(), email: user.email, role: user.role, companyId: user.companyId?.toString() ?? null });
  }

  async refresh(payload: JwtPayload) {
    return this.generateTokens(payload);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return;
    const token = this.jwtService.sign(
      { sub: user._id.toString(), type: 'password-reset' },
      { secret: this.config.get('JWT_SECRET'), expiresIn: '1h' },
    );
    const link = `${this.config.get('FRONTEND_URL')}/reset-password?token=${token}`;
    await this.mailService.sendPasswordResetEmail(user.email, user.name, link);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    let payload: { sub: string; type: string };
    try {
      payload = await this.jwtService.verifyAsync(token, { secret: this.config.get('JWT_SECRET') });
    } catch {
      throw new BadRequestException('This reset link is invalid or has expired.');
    }
    if (payload.type !== 'password-reset') {
      throw new BadRequestException('This reset link is invalid or has expired.');
    }
    await this.usersService.setPasswordHash(payload.sub, newPassword);
  }

  private generateTokens(payload: JwtPayload) {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES', '15m'),
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES', '7d'),
    });
    return { accessToken, refreshToken };
  }
}
