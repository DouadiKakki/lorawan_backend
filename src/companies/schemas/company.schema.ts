import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CompanyDocument = Company & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Company {
  @Prop({ required: true }) name: string;
  @Prop({ default: '' }) email: string;
  @Prop({ default: '' }) phone: string;
  @Prop({ default: '' }) address: string;
  @Prop({ required: true, enum: ['active', 'inactive'], default: 'active' }) status: string;
  @Prop({ default: false }) isRoot: boolean;
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Gateway' }], default: [] }) sharedGateways: Types.ObjectId[];
  @Prop({ type: [{ type: Types.ObjectId, ref: 'EndDevice' }], default: [] }) sharedDevices: Types.ObjectId[];
}

export const CompanySchema = SchemaFactory.createForClass(Company);
