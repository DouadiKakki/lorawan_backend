import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';

jest.mock('bcrypt');

describe('AuthService.login', () => {
  let service: AuthService;
  let usersService: { findByEmail: jest.Mock; updateLastLogin: jest.Mock };

  beforeEach(async () => {
    usersService = { findByEmail: jest.fn(), updateLastLogin: jest.fn() };
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('token') } },
        { provide: ConfigService, useValue: { get: (_k: string, d?: string) => d ?? 'secret' } },
        { provide: MailService, useValue: { sendPasswordResetEmail: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('rejects login for a pending user', async () => {
    usersService.findByEmail.mockResolvedValue({ _id: 'u1', email: 'a@test.com', passwordHash: 'hash', role: 'viewer', status: 'pending' });
    await expect(service.login({ email: 'a@test.com', password: 'pw' } as any))
      .rejects.toThrow('Please confirm your email before logging in.');
  });

  it('allows login for an active user', async () => {
    usersService.findByEmail.mockResolvedValue({ _id: 'u1', email: 'a@test.com', passwordHash: 'hash', role: 'viewer', status: 'active' });
    const result = await service.login({ email: 'a@test.com', password: 'pw' } as any);
    expect(result).toHaveProperty('accessToken');
  });
});

describe('AuthService.forgotPassword / resetPassword', () => {
  let service: AuthService;
  let usersService: { findByEmail: jest.Mock; setPasswordHash: jest.Mock };
  let mailService: { sendPasswordResetEmail: jest.Mock };
  let jwtService: { sign: jest.Mock; verifyAsync: jest.Mock };

  beforeEach(async () => {
    usersService = { findByEmail: jest.fn(), setPasswordHash: jest.fn() };
    mailService = { sendPasswordResetEmail: jest.fn().mockResolvedValue(true) };
    jwtService = { sign: jest.fn().mockReturnValue('reset.jwt.token'), verifyAsync: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: MailService, useValue: mailService },
        { provide: ConfigService, useValue: { get: (k: string, d?: string) => ({ JWT_SECRET: 'secret', FRONTEND_URL: 'http://localhost:5173' }[k] ?? d) } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('sends a reset email when the user exists, and does nothing detectable when it does not', async () => {
    usersService.findByEmail.mockResolvedValue({ _id: 'u1', email: 'a@test.com', name: 'A' });
    await service.forgotPassword('a@test.com');
    expect(mailService.sendPasswordResetEmail).toHaveBeenCalledWith('a@test.com', 'A', expect.stringContaining('http://localhost:5173/reset-password?token=reset.jwt.token'));

    usersService.findByEmail.mockResolvedValue(null);
    await expect(service.forgotPassword('unknown@test.com')).resolves.toBeUndefined();
    expect(mailService.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });

  it('resets the password when the token is valid and typed correctly', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'u1', type: 'password-reset' });
    await service.resetPassword('valid.token', 'newpassword123');
    expect(usersService.setPasswordHash).toHaveBeenCalledWith('u1', 'newpassword123');
  });

  it('rejects a token with the wrong type', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'u1', type: 'email-confirm' });
    await expect(service.resetPassword('wrong.type', 'newpassword123')).rejects.toThrow();
    expect(usersService.setPasswordHash).not.toHaveBeenCalled();
  });
});
