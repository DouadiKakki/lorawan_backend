import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GatewaysService } from './gateways.service';
import { GatewaysController } from './gateways.controller';
import { Gateway, GatewaySchema } from './schemas/gateway.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Gateway.name, schema: GatewaySchema }])],
  providers: [GatewaysService],
  controllers: [GatewaysController],
  exports: [GatewaysService],
})
export class GatewaysModule {}
