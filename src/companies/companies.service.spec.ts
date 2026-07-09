import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { Company } from './schemas/company.schema';
import { Gateway } from '../gateways/schemas/gateway.schema';
import { EndDevice } from '../end-devices/schemas/end-device.schema';
import { User } from '../users/schemas/user.schema';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let model: any;
  let gatewayModel: any;
  let deviceModel: any;
  let userModel: any;

  beforeEach(async () => {
    model = {
      findById: jest.fn(),
      findByIdAndDelete: jest.fn().mockReturnValue({ exec: () => Promise.resolve(true) }),
      find: jest.fn().mockReturnValue({ lean: () => ({ exec: () => Promise.resolve([]) }) }),
    };
    gatewayModel = { aggregate: jest.fn().mockResolvedValue([]) };
    deviceModel = { aggregate: jest.fn().mockResolvedValue([]) };
    userModel = { aggregate: jest.fn().mockResolvedValue([]) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: getModelToken(Company.name), useValue: model },
        { provide: getModelToken(Gateway.name), useValue: gatewayModel },
        { provide: getModelToken(EndDevice.name), useValue: deviceModel },
        { provide: getModelToken(User.name), useValue: userModel },
      ],
    }).compile();

    service = moduleRef.get(CompaniesService);
  });

  describe('remove', () => {
    it('throws BadRequestException when the company is root', async () => {
      model.findById.mockReturnValue({ exec: () => Promise.resolve({ _id: 'c1', isRoot: true }) });
      await expect(service.remove('c1')).rejects.toThrow(BadRequestException);
      expect(model.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('deletes a non-root company', async () => {
      model.findById.mockReturnValue({ exec: () => Promise.resolve({ _id: 'c2', isRoot: false }) });
      await service.remove('c2');
      expect(model.findByIdAndDelete).toHaveBeenCalledWith('c2');
    });

    it('throws NotFoundException when the company does not exist', async () => {
      model.findById.mockReturnValue({ exec: () => Promise.resolve(null) });
      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll — users count', () => {
    it('maps aggregated user counts onto each company', async () => {
      model.find.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve([{ _id: 'c1' }, { _id: 'c2' }]) }) });
      userModel.aggregate.mockResolvedValue([{ _id: 'c1', count: 5 }]);
      const result = await service.findAll();
      expect(result.find((c: any) => c._id === 'c1').users).toBe(5);
      expect(result.find((c: any) => c._id === 'c2').users).toBe(0);
    });
  });
});
