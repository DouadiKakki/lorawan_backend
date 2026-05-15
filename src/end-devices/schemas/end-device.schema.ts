import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
class ConnectedGateway {
  @Prop({ required: true }) gatewayEUI: string;
  @Prop({ required: true }) rssi: number;
}
const ConnectedGatewaySchema = SchemaFactory.createForClass(ConnectedGateway);

export type EndDeviceDocument = EndDevice & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class EndDevice {
  @Prop({ required: true }) name: string;
  @Prop({ required: true, unique: true }) devEUI: string;
  @Prop({ type: Types.ObjectId, ref: 'Application' }) applicationId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Company' }) companyId: Types.ObjectId;
  @Prop({ required: true, enum: ['active', 'inactive'], default: 'active' }) status: string;
  @Prop({ default: 0 }) battery: number;
  @Prop({ default: 0 }) rssi: number;
  @Prop() lastSeen: Date;
  @Prop({ type: [ConnectedGatewaySchema], default: [] }) connectedGateways: ConnectedGateway[];
}

export const EndDeviceSchema = SchemaFactory.createForClass(EndDevice);
