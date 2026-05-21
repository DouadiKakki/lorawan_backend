import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GatewaysService } from './gateways.service';
import { GatewaysController } from './gateways.controller';
import { Gateway, GatewaySchema } from './schemas/gateway.schema';
import { UplinkMessage, UplinkMessageSchema } from '../uplinks/schemas/uplink-message.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Gateway.name, schema: GatewaySchema },
    { name: UplinkMessage.name, schema: UplinkMessageSchema },
  ])],
  providers: [GatewaysService],
  controllers: [GatewaysController],
  exports: [GatewaysService],
})
export class GatewaysModule {}
