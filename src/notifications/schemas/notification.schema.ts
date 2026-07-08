import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Notification {
  @Prop({ required: true, enum: ['warning', 'success', 'info'] }) type: string;
  @Prop({ required: true }) title: string;
  @Prop({ required: true }) message: string;
  @Prop({ default: false }) read: boolean;
  @Prop({ type: Types.ObjectId, ref: 'Company' }) companyId: Types.ObjectId;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
