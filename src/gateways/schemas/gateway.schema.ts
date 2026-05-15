import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GatewayDocument = Gateway & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Gateway {
  @Prop({ required: true }) name: string;
  @Prop({ required: true, unique: true }) eui: string;
  @Prop({ default: '' }) location: string;
  @Prop({ type: Types.ObjectId, ref: 'Company' }) companyId: Types.ObjectId;
  @Prop({ required: true, enum: ['online', 'offline', 'warning'], default: 'offline' }) status: string;
  @Prop({ default: '0%' }) uptime: string;
  @Prop() lastSeen: Date;
}

export const GatewaySchema = SchemaFactory.createForClass(Gateway);
