import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { ConfirmController } from './confirm.controller';
import { UsersService } from './users.service';

describe('ConfirmController', () => {
  let controller: ConfirmController;
  let usersService: { confirmEmail: jest.Mock };
  let jwtService: { verifyAsync: jest.Mock };

  beforeEach(async () => {
    usersService = { confirmEmail: jest.fn().mockResolvedValue(undefined) };
    jwtService = { verifyAsync: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [ConfirmController],
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: () => 'secret' } },
      ],
    }).compile();

    controller = moduleRef.get(ConfirmController);
  });

  it('activates the user when the token is valid and typed correctly', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user123', type: 'email-confirm' });
    const result = await controller.confirm('valid.token');
    expect(usersService.confirmEmail).toHaveBeenCalledWith('user123');
    expect(result).toEqual({ message: 'Your account has been confirmed. You can now log in.' });
  });

  it('rejects a token with the wrong type', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user123', type: 'password-reset' });
    await expect(controller.confirm('wrong.type.token')).rejects.toThrow(BadRequestException);
    expect(usersService.confirmEmail).not.toHaveBeenCalled();
  });

  it('rejects an expired or invalid token', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
    await expect(controller.confirm('expired.token')).rejects.toThrow(BadRequestException);
  });
});
