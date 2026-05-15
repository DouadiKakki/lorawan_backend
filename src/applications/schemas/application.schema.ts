import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ApplicationDocument = Application & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Application {
  @Prop({ required: true }) name: string;
  @Prop({ default: '' }) description: string;
  @Prop({ default: '' }) brand: string;
  @Prop({ type: Types.ObjectId, ref: 'Company' }) companyId: Types.ObjectId;
  @Prop({ required: true, enum: ['active', 'inactive'], default: 'active' }) status: string;
}

export const ApplicationSchema = SchemaFactory.createForClass(Application);
