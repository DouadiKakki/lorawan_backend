import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(@InjectModel(Notification.name) private model: Model<NotificationDocument>) {}

  create(type: 'warning' | 'success' | 'info', title: string, message: string) {
    return new this.model({ type, title, message }).save();
  }

  findAll() {
    return this.model.find().sort({ createdAt: -1 }).exec();
  }

  async markRead(id: string) {
    const doc = await this.model.findByIdAndUpdate(id, { read: true }, { new: true }).exec();
    if (!doc) throw new NotFoundException('Notification not found');
    return doc;
  }

  async markAllRead() {
    await this.model.updateMany({ read: false }, { read: true }).exec();
  }
}
