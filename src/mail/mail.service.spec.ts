import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailService } from './mail.service';

jest.mock('nodemailer');

describe('MailService', () => {
  let service: MailService;
  let sendMailMock: jest.Mock;

  beforeEach(async () => {
    sendMailMock = jest.fn().mockResolvedValue({ messageId: 'abc123' });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail: sendMailMock });

    const moduleRef = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => ({
              EMAIL_SERVER_DOMAIN: 'smtp.example.com',
              EMAIL_SERVER_PORT: '465',
              EMAIL_USER_NOREPLY: 'noreply@example.com',
              EMAIL_PASS_NOREPLY: 'secret',
            }[key]),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(MailService);
  });

  it('sends a confirmation email with the link in the body', async () => {
    const result = await service.sendConfirmationEmail('user@test.com', 'Jane', 'http://app/confirm?token=xyz');
    expect(result).toBe(true);
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'user@test.com',
      from: 'TeleNavix <noreply@example.com>',
      subject: expect.stringContaining('Confirm'),
      html: expect.stringContaining('http://app/confirm?token=xyz'),
    }));
  });

  it('returns false when sendMail throws', async () => {
    sendMailMock.mockRejectedValue(new Error('smtp down'));
    const result = await service.sendConfirmationEmail('user@test.com', 'Jane', 'http://app/confirm?token=xyz');
    expect(result).toBe(false);
  });

  it('sends a password reset email with the link in the body', async () => {
    const result = await service.sendPasswordResetEmail('user@test.com', 'Jane', 'http://app/reset-password?token=xyz');
    expect(result).toBe(true);
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'user@test.com',
      from: 'TeleNavix <noreply@example.com>',
      subject: expect.stringContaining('Reset'),
      html: expect.stringContaining('http://app/reset-password?token=xyz'),
    }));
  });
});
