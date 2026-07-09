import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { DownlinksService } from './downlinks.service';
import { DownlinkMessage } from './schemas/downlink-message.schema';
import { EndDevice } from '../end-devices/schemas/end-device.schema';

describe('DownlinksService', () => {
  let service: DownlinksService;
  let model: any;
  let deviceModel: any;

  beforeEach(async () => {
    model = {
      find: jest.fn().mockReturnValue({
        sort: () => ({ skip: () => ({ limit: () => ({ exec: () => Promise.resolve([]) }) }) }),
      }),
      countDocuments: jest.fn().mockReturnValue({ exec: () => Promise.resolve(0) }),
    };
    deviceModel = {
      find: jest.fn().mockReturnValue({ distinct: () => ({ exec: () => Promise.resolve(['AABBCC']) }) }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DownlinksService,
        { provide: getModelToken(DownlinkMessage.name), useValue: model },
        { provide: getModelToken(EndDevice.name), useValue: deviceModel },
      ],
    }).compile();

    service = moduleRef.get(DownlinksService);
  });

  it('scopes the query to the requesting company by resolving allowed deviceEUIs for a non-Super-Admin', async () => {
    await service.findAll({ role: 'admin', companyId: 'company-abc' }, 1, 50);
    expect(deviceModel.find).toHaveBeenCalledWith({ companyId: 'company-abc' });
    expect(model.find).toHaveBeenCalledWith({ deviceEUI: { $in: ['AABBCC'] } });
  });

  it('applies no company filter for Super Admin', async () => {
    await service.findAll({ role: 'Super Admin', companyId: 'root-id' }, 1, 50);
    expect(deviceModel.find).not.toHaveBeenCalled();
    expect(model.find).toHaveBeenCalledWith({});
  });

  it('filters by an explicit deviceEUI when provided, regardless of role', async () => {
    await service.findAll({ role: 'admin', companyId: 'company-abc' }, 1, 50, 'DDEEFF');
    expect(model.find).toHaveBeenCalledWith({ deviceEUI: 'DDEEFF' });
  });
});
