import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { EndDevice, EndDeviceDocument } from '../end-devices/schemas/end-device.schema';
import { Company, CompanyDocument } from '../companies/schemas/company.schema';
import { MailService } from '../mail/mail.service';
import { companyFilter } from '../auth/company-scope.util';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(EndDevice.name) private endDeviceModel: Model<EndDeviceDocument>,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    private mailService: MailService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  private async appendDevicesCount(users: UserDocument[]): Promise<any[]> {
    const companyIds = [...new Set(users.map(u => u.companyId?.toString()).filter(Boolean))];
    const companyCounts = new Map<string, number>();
    for (const companyId of companyIds) {
      const count = await this.endDeviceModel.countDocuments({ companyId }).exec();
      companyCounts.set(companyId, count);
    }
    return users.map(u => {
      const devicesCount = u.companyId ? (companyCounts.get(u.companyId.toString()) ?? 0) : 0;
      return { ...u.toObject(), devicesCount };
    });
  }

  async create(dto: CreateUserDto): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (existing) throw new ConflictException('Email already in use');

    let companyId = dto.companyId;
    if (dto.role === 'Super Admin') {
      const rootCompany = await this.companyModel.findOne({ isRoot: true });
      companyId = rootCompany?._id?.toString();
    } else if (!companyId) {
      throw new BadRequestException('Company is required');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = new this.userModel({ ...dto, companyId, passwordHash, status: 'pending' });
    const saved = await user.save();

    const token = this.jwtService.sign(
      { sub: saved._id.toString(), type: 'email-confirm' },
      { secret: this.config.get('JWT_SECRET'), expiresIn: '48h' },
    );
    const link = `${this.config.get('FRONTEND_URL')}/confirm?token=${token}`;
    await this.mailService.sendConfirmationEmail(saved.email, saved.name, link);

    return saved;
  }

  async findAll(user: { role: string; companyId: string | null }): Promise<any[]> {
    const filter = { ...companyFilter(user) };
    if (user.role !== 'Super Admin') filter.role = { $ne: 'Super Admin' };
    const users = await this.userModel.find(filter).select('-passwordHash').exec();
    return this.appendDevicesCount(users);
  }

  async findOne(id: string, user: { role: string; companyId: string | null }): Promise<any> {
    const filter: any = { _id: id, ...companyFilter(user) };
    if (user.role !== 'Super Admin') filter.role = { $ne: 'Super Admin' };
    const found = await this.userModel.findOne(filter).select('-passwordHash').exec();
    if (!found) throw new NotFoundException('User not found');
    const [result] = await this.appendDevicesCount([found]);
    return result;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserDocument> {
    const update: any = { ...dto };
    if (dto.password) {
      update.passwordHash = await bcrypt.hash(dto.password, 10);
      delete update.password;
    }
    const user = await this.userModel.findByIdAndUpdate(id, update, { new: true }).select('-passwordHash').exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('User not found');
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, { lastLogin: new Date() }).exec();
  }

  async confirmEmail(id: string): Promise<void> {
    const user = await this.userModel.findByIdAndUpdate(id, { status: 'active' }).exec();
    if (!user) throw new NotFoundException('User not found');
  }
}
