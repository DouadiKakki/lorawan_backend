import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UplinkMessageDocument = UplinkMessage & Document;

@Schema()
export class UplinkMessage {
  @Prop({ required: true, index: true }) deviceEUI: string;
  @Prop({ type: Types.ObjectId, ref: 'Application' }) applicationId: Types.ObjectId;
  @Prop({ required: true }) gatewayEUI: string;
  @Prop({ default: 0 }) rssi: number;
  @Prop({ default: 0 }) snr: number;
  @Prop({ default: 0 }) frequency: number;
  @Prop() dataRate: string;
  @Prop() codingRate: string;
  @Prop() modulation: string;
  @Prop() spreadingFactor: number;
  @Prop() bandwidth: number;
  @Prop() channel: number;
  @Prop({ default: 0 }) fPort: number;
  @Prop({ default: 0 }) fCnt: number;
  @Prop({ type: Buffer }) data: Buffer;
  @Prop({ type: Object }) decodedData: Record<string, any>;
  @Prop({ required: true, index: true }) receivedAt: Date;
}

export const UplinkMessageSchema = SchemaFactory.createForClass(UplinkMessage);
UplinkMessageSchema.index({ receivedAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL
