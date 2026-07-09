import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DownlinkMessageDocument = DownlinkMessage & Document;

@Schema()
export class DownlinkMessage {
  @Prop({ required: true, index: true }) deviceEUI: string;
  @Prop({ required: true }) fPort: number;
  @Prop({ default: false }) confirmed: boolean;
  @Prop({ required: true, enum: ['queued', 'sent', 'failed'], default: 'queued' }) status: string;
  @Prop({ type: Buffer }) payload: Buffer;
  @Prop({ required: true, index: true }) sentAt: Date;
}

export const DownlinkMessageSchema = SchemaFactory.createForClass(DownlinkMessage);
DownlinkMessageSchema.index({ sentAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL, matching UplinkMessage's retention
