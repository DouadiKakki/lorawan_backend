import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ApplicationsService } from './applications.service';
import { Application } from './schemas/application.schema';
import { EndDevice } from '../end-devices/schemas/end-device.schema';

describe('ApplicationsService.findAll — company scoping', () => {
  let service: ApplicationsService;
  let model: { find: jest.Mock };
  let deviceModel: { aggregate: jest.Mock };

  beforeEach(async () => {
    model = { find: jest.fn().mockReturnValue({ lean: () => ({ exec: () => Promise.resolve([]) }) }) };
    deviceModel = { aggregate: jest.fn().mockResolvedValue([]) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: getModelToken(Application.name), useValue: model },
        { provide: getModelToken(EndDevice.name), useValue: deviceModel },
      ],
    }).compile();

    service = moduleRef.get(ApplicationsService);
  });

  it('scopes the query to the requesting company for a non-Super-Admin', async () => {
    await service.findAll({ role: 'admin', companyId: 'company-abc' });
    expect(model.find).toHaveBeenCalledWith({ companyId: 'company-abc' });
  });

  it('applies no company filter for Super Admin', async () => {
    await service.findAll({ role: 'Super Admin', companyId: 'root-id' });
    expect(model.find).toHaveBeenCalledWith({});
  });
});
