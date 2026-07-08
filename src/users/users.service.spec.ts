import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { MailService } from '../mail/mail.service';
import { User } from './schemas/user.schema';
import { EndDevice } from '../end-devices/schemas/end-device.schema';
import { Company } from '../companies/schemas/company.schema';

describe('UsersService.create', () => {
  let service: UsersService;
  let userModel: any;
  let mailService: { sendConfirmationEmail: jest.Mock };
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    const savedDoc = { _id: 'user123', email: 'new@test.com', name: 'New User', save: jest.fn() };
    savedDoc.save.mockResolvedValue(savedDoc);

    function FakeUserModel(this: any, data: any) {
      Object.assign(this, data, savedDoc);
    }
    (FakeUserModel as any).findOne = jest.fn().mockResolvedValue(null);
    userModel = FakeUserModel;

    mailService = { sendConfirmationEmail: jest.fn().mockResolvedValue(true) };
    jwtService = { sign: jest.fn().mockReturnValue('signed.jwt.token') };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(EndDevice.name), useValue: {} },
        { provide: getModelToken(Company.name), useValue: {} },
        { provide: MailService, useValue: mailService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: (k: string) => ({ JWT_SECRET: 'secret', FRONTEND_URL: 'http://localhost:5173' }[k]) } },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('creates the user with pending status and sends a confirmation email', async () => {
    const dto = { name: 'New User', email: 'new@test.com', password: 'longpassword', role: 'viewer', companyId: 'company-abc' } as any;
    await service.create(dto);

    expect(mailService.sendConfirmationEmail).toHaveBeenCalledWith(
      'new@test.com',
      'New User',
      expect.stringContaining('http://localhost:5173/confirm?token=signed.jwt.token'),
    );
    expect(jwtService.sign).toHaveBeenCalledWith(
      { sub: 'user123', type: 'email-confirm' },
      { secret: 'secret', expiresIn: '48h' },
    );
  });

  it('throws ConflictException when email already exists', async () => {
    userModel.findOne = jest.fn().mockResolvedValue({ _id: 'existing' });
    const dto = { name: 'New User', email: 'new@test.com', password: 'longpassword', role: 'viewer' } as any;
    await expect(service.create(dto)).rejects.toThrow(ConflictException);
  });
});

describe('UsersService.create — company requirement', () => {
  let service: UsersService;
  let userModel: any;
  let companyModel: { findOne: jest.Mock };
  let mailService: { sendConfirmationEmail: jest.Mock };
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    const savedDoc = { _id: 'user123', email: 'new@test.com', name: 'New User', save: jest.fn() };
    savedDoc.save.mockResolvedValue(savedDoc);
    function FakeUserModel(this: any, data: any) { Object.assign(this, data, savedDoc); }
    (FakeUserModel as any).findOne = jest.fn().mockResolvedValue(null);
    userModel = FakeUserModel;

    companyModel = { findOne: jest.fn().mockResolvedValue({ _id: 'root-company-id' }) };
    mailService = { sendConfirmationEmail: jest.fn().mockResolvedValue(true) };
    jwtService = { sign: jest.fn().mockReturnValue('signed.jwt.token') };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(EndDevice.name), useValue: {} },
        { provide: getModelToken(Company.name), useValue: companyModel },
        { provide: MailService, useValue: mailService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: (k: string) => ({ JWT_SECRET: 'secret', FRONTEND_URL: 'http://localhost:5173' }[k]) } },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('throws BadRequestException when a non-Super-Admin user has no companyId', async () => {
    const dto = { name: 'New User', email: 'new@test.com', password: 'longpassword', role: 'viewer' } as any;
    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
  });

  it('auto-assigns the root company to a Super Admin user regardless of companyId passed', async () => {
    const dto = { name: 'New Admin', email: 'new@test.com', password: 'longpassword', role: 'Super Admin' } as any;
    await service.create(dto);
    expect(companyModel.findOne).toHaveBeenCalledWith({ isRoot: true });
  });

  it('accepts a non-Super-Admin user when companyId is provided', async () => {
    const dto = { name: 'New User', email: 'new@test.com', password: 'longpassword', role: 'viewer', companyId: 'company-abc' } as any;
    await expect(service.create(dto)).resolves.toBeDefined();
  });
});
