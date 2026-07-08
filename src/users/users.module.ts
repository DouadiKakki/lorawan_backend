import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { ConfirmController } from './confirm.controller';
import { User, UserSchema } from './schemas/user.schema';
import { EndDevice, EndDeviceSchema } from '../end-devices/schemas/end-device.schema';
import { Company, CompanySchema } from '../companies/schemas/company.schema';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: EndDevice.name, schema: EndDeviceSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
    MailModule,
    JwtModule.register({}),
  ],
  providers: [UsersService],
  controllers: [UsersController, ConfirmController],
  exports: [UsersService],
})
export class UsersModule {}
