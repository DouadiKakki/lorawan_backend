import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { GatewaysService } from './gateways.service';
import { Gateway } from './schemas/gateway.schema';
import { UplinkMessage } from '../uplinks/schemas/uplink-message.schema';
import { EventsGateway } from '../websocket/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';

describe('GatewaysService.updateLocationFromStat', () => {
  let service: GatewaysService;
  let model: any;

  beforeEach(async () => {
    model = {
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: () => Promise.resolve({ eui: 'AABBCC', latitude: 40.7, longitude: -74.0 }) }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        GatewaysService,
        { provide: getModelToken(Gateway.name), useValue: model },
        { provide: getModelToken(UplinkMessage.name), useValue: {} },
        { provide: EventsGateway, useValue: { emitGatewayStatus: jest.fn(), emitNotification: jest.fn() } },
        { provide: NotificationsService, useValue: { create: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(GatewaysService);
  });

  it('updates lat/long/altitude and marks locationType as inherited', async () => {
    await service.updateLocationFromStat('AABBCC', 40.7128, -74.0060, 10);
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { eui: 'AABBCC' },
      { latitude: 40.7128, longitude: -74.0060, altitude: 10, locationType: 'inherited' },
      { new: true },
    );
  });

  it('defaults altitude to 0 when not provided', async () => {
    await service.updateLocationFromStat('AABBCC', 40.7128, -74.0060);
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { eui: 'AABBCC' },
      { latitude: 40.7128, longitude: -74.0060, altitude: 0, locationType: 'inherited' },
      { new: true },
    );
  });
});
