import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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
    const companyNames = [...new Set(users.map(u => u.company).filter(Boolean))];
    const companies = await this.companyModel.find({ name: { $in: companyNames } }).select('_id name').exec();
    const companyIdsByName = new Map(companies.map(c => [c.name, c._id]));

    const companyCounts = new Map<string, number>();
    for (const company of companies) {
      const count = await this.endDeviceModel.countDocuments({ companyId: company._id }).exec();
      companyCounts.set(company._id.toString(), count);
    }

    return users.map(u => {
      const companyId = u.company ? companyIdsByName.get(u.company) : null;
      const devicesCount = companyId ? (companyCounts.get(companyId.toString()) ?? 0) : 0;
      return { ...u.toObject(), devicesCount };
    });
  }

  async create(dto: CreateUserDto): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (existing) throw new ConflictException('Email already in use');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = new this.userModel({ ...dto, passwordHash, status: 'pending' });
    const saved = await user.save();

    const token = this.jwtService.sign(
      { sub: saved._id.toString(), type: 'email-confirm' },
      { secret: this.config.get('JWT_SECRET'), expiresIn: '48h' },
    );
    const link = `${this.config.get('FRONTEND_URL')}/confirm?token=${token}`;
    await this.mailService.sendConfirmationEmail(saved.email, saved.name, link);

    return saved;
  }

  async findAll(): Promise<any[]> {
    const users = await this.userModel.find().select('-passwordHash').exec();
    return this.appendDevicesCount(users);
  }

  async findOne(id: string): Promise<any> {
    const user = await this.userModel.findById(id).select('-passwordHash').exec();
    if (!user) throw new NotFoundException('User not found');
    const [result] = await this.appendDevicesCount([user]);
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
