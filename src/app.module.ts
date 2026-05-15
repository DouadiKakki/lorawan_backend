import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ApplicationsModule } from './applications/applications.module';
import { GatewaysModule } from './gateways/gateways.module';
import { EndDevicesModule } from './end-devices/end-devices.module';
import { CompaniesModule } from './companies/companies.module';
import { IntegrationsModule } from './integrations/integrations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({ uri: config.get<string>('MONGODB_URI') }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    ApplicationsModule,
    GatewaysModule,
    EndDevicesModule,
    CompaniesModule,
    IntegrationsModule,
  ],
})
export class AppModule {}
