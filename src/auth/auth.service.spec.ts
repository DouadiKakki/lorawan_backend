import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

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
