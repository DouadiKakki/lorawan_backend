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
    const resolveCompanyId = (u: UserDocument): string | undefined => {
      const value = u.companyId as any;
      if (!value) return undefined;
      return (value._id ?? value).toString();
    };
    const companyIds = [...new Set(users.map(resolveCompanyId).filter(Boolean))] as string[];
    const companyCounts = new Map<string, number>();
    for (const companyId of companyIds) {
      const count = await this.endDeviceModel.countDocuments({ companyId }).exec();
      companyCounts.set(companyId, count);
    }
    return users.map(u => {
      const companyId = resolveCompanyId(u);
      const devicesCount = companyId ? (companyCounts.get(companyId) ?? 0) : 0;
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
    const users = await this.userModel.find(filter).select('-passwordHash').populate('companyId', 'name').exec();
    return this.appendDevicesCount(users);
  }

  async findOne(id: string, user: { role: string; companyId: string | null }): Promise<any> {
    const filter: any = { _id: id, ...companyFilter(user) };
    if (user.role !== 'Super Admin') filter.role = { $ne: 'Super Admin' };
    const found = await this.userModel.findOne(filter).select('-passwordHash').populate('companyId', 'name').exec();
    if (!found) throw new NotFoundException('User not found');
    const [result] = await this.appendDevicesCount([found]);
    return result;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async update(id: string, dto: UpdateUserDto, user: { role: string; companyId: string | null }): Promise<UserDocument> {
    const existing = await this.checkOwnership(id, user);
    if (!existing) throw new NotFoundException('User not found');
    const update: any = { ...dto };
    if (dto.password) {
      update.passwordHash = await bcrypt.hash(dto.password, 10);
      delete update.password;
    }
    const updated = await this.userModel.findByIdAndUpdate(id, update, { returnDocument: 'after' }).select('-passwordHash').exec();
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  async remove(id: string, user: { role: string; companyId: string | null }): Promise<void> {
    const existing = await this.checkOwnership(id, user);
    if (!existing) throw new NotFoundException('User not found');
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

  async setPasswordHash(id: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const user = await this.userModel.findByIdAndUpdate(id, { passwordHash }).exec();
    if (!user) throw new NotFoundException('User not found');
  }

  private async checkOwnership(id: string, user: { role: string; companyId: string | null }): Promise<UserDocument | null> {
    const doc = await this.userModel.findById(id).exec();
    if (!doc) return null;
    if (user.role !== 'Super Admin' && doc.companyId?.toString() !== user.companyId) return null;
    return doc;
  }

  async bulkDelete(ids: string[], user: { role: string; companyId: string | null }) {
    const succeeded: string[] = [];
    const failed: { id: string; reason: string }[] = [];
    for (const id of ids) {
      const doc = await this.checkOwnership(id, user);
      if (!doc) { failed.push({ id, reason: 'User not found' }); continue; }
      await this.userModel.findByIdAndDelete(id).exec();
      succeeded.push(id);
    }
    return { succeeded, failed };
  }

  async bulkDeactivate(ids: string[], user: { role: string; companyId: string | null }) {
    const succeeded: string[] = [];
    const failed: { id: string; reason: string }[] = [];
    for (const id of ids) {
      const doc = await this.checkOwnership(id, user);
      if (!doc) { failed.push({ id, reason: 'User not found' }); continue; }
      await this.userModel.findByIdAndUpdate(id, { status: 'inactive' }).exec();
      succeeded.push(id);
    }
    return { succeeded, failed };
  }

  async bulkResetPassword(ids: string[], user: { role: string; companyId: string | null }) {
    const succeeded: string[] = [];
    const failed: { id: string; reason: string }[] = [];
    for (const id of ids) {
      const doc = await this.checkOwnership(id, user);
      if (!doc) { failed.push({ id, reason: 'User not found' }); continue; }
      const token = this.jwtService.sign(
        { sub: doc._id.toString(), type: 'password-reset' },
        { secret: this.config.get('JWT_SECRET'), expiresIn: '1h' },
      );
      const link = `${this.config.get('FRONTEND_URL')}/reset-password?token=${token}`;
      await this.mailService.sendPasswordResetEmail(doc.email, doc.name, link);
      succeeded.push(id);
    }
    return { succeeded, failed };
  }
}
