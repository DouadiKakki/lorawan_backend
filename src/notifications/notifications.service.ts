import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { companyFilter } from '../auth/company-scope.util';

@Injectable()
export class NotificationsService {
  constructor(@InjectModel(Notification.name) private model: Model<NotificationDocument>) {}

  create(type: 'warning' | 'success' | 'info', title: string, message: string, companyId: string | null) {
    return new this.model({ type, title, message, companyId }).save();
  }

  findAll(user: { role: string; companyId: string | null }) {
    return this.model.find(companyFilter(user)).sort({ createdAt: -1 }).exec();
  }

  async markRead(id: string) {
    const doc = await this.model.findByIdAndUpdate(id, { read: true }, { returnDocument: 'after' }).exec();
    if (!doc) throw new NotFoundException('Notification not found');
    return doc;
  }

  async markAllRead() {
    await this.model.updateMany({ read: false }, { read: true }).exec();
  }
}
