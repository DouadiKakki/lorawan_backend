import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class User {
  @Prop({ required: true }) name: string;
  @Prop({ required: true, unique: true, lowercase: true }) email: string;
  @Prop({ required: true }) passwordHash: string;
  @Prop({ required: true, enum: ['admin', 'operator', 'viewer', 'Super Admin'], default: 'viewer' }) role: string;
  @Prop({ required: true, enum: ['active', 'inactive', 'pending'], default: 'active' }) status: string;
  @Prop() company: string;
  @Prop() lastLogin: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
