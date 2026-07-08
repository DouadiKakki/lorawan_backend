import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { IntegrationDispatchService } from './integration-dispatch.service';
import { Integration, IntegrationSchema } from './schemas/integration.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Integration.name, schema: IntegrationSchema }])],
  providers: [IntegrationsService, IntegrationDispatchService],
  controllers: [IntegrationsController],
})
export class IntegrationsModule {}
