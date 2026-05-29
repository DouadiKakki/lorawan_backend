import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ApplicationsModule } from './applications/applications.module';
import { GatewaysModule } from './gateways/gateways.module';
import { EndDevicesModule } from './end-devices/end-devices.module';
import { CompaniesModule } from './companies/companies.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { UplinkMessagesModule } from './uplinks/uplinks.module';
import { MqttModule } from './mqtt/mqtt.module';
import { WebsocketModule } from './websocket/websocket.module';
import { StorageModule } from './storage/storage.module';
import { KerlinkModule } from './kerlink/kerlink.module';
import { AppConfigModule } from './config/config.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({ uri: config.get<string>('MONGODB_URI') }),
      inject: [ConfigService],
    }),
    EventEmitterModule.forRoot(),
    AuthModule,
    UsersModule,
    ApplicationsModule,
    GatewaysModule,
    EndDevicesModule,
    CompaniesModule,
    IntegrationsModule,
    UplinkMessagesModule,
    MqttModule,
    WebsocketModule,
    StorageModule,
    KerlinkModule,
    AppConfigModule,
  ],
})
export class AppModule {}
