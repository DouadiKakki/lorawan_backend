import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type IntegrationDocument = Integration & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Integration {
  @Prop({ required: true }) name: string;
  @Prop({ required: true, enum: ['Cloud', 'Webhook', 'Protocol', 'API', 'Database', 'Visualization', 'Notification', 'Automation'] }) type: string;
  @Prop({ required: true, enum: ['active', 'inactive'], default: 'active' }) status: string;
  @Prop({ default: '' }) url: string;
  @Prop({ default: '' }) apiKey: string;
  @Prop({ default: 0 }) events: number;
  @Prop() lastSync: Date;
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true }) companyId: Types.ObjectId;
}

export const IntegrationSchema = SchemaFactory.createForClass(Integration);
