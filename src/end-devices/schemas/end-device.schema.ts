import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
class ConnectedGateway {
  @Prop({ required: true }) gatewayEUI: string;
  @Prop({ required: true }) rssi: number;
}
const ConnectedGatewaySchema = SchemaFactory.createForClass(ConnectedGateway);

@Schema({ _id: false })
class Collaborator {
  @Prop({ required: true }) userId: string;
  @Prop({ required: true, enum: ['full', 'custom'] }) permission: string;
  @Prop({ type: Object, default: {} }) customPermissions: Record<string, boolean>;
  @Prop({ required: true }) addedDate: string;
}
const CollaboratorSchema = SchemaFactory.createForClass(Collaborator);

@Schema({ _id: false })
class SharedCompany {
  @Prop({ required: true }) companyId: string;
  @Prop({ required: true, enum: ['full', 'custom'] }) permission: string;
  @Prop({ type: Object, default: {} }) customPermissions: Record<string, boolean>;
  @Prop({ required: true }) addedDate: string;
}
const SharedCompanySchema = SchemaFactory.createForClass(SharedCompany);

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
  @Prop({ default: 0 }) fCntUp: number;
  @Prop() devAddr: string;
  @Prop() appSKey: string;
  @Prop() nwkSKey: string;
  @Prop({ type: [ConnectedGatewaySchema], default: [] }) connectedGateways: ConnectedGateway[];
  // LoRaWAN OTAA keys
  @Prop() joinEUI: string;
  @Prop() appKey: string;
  @Prop() nwkKey: string;
  // Session keys (populated after join)
  @Prop() fNwkSIntKey: string;
  @Prop() sNwkSIntKey: string;
  @Prop() nwkSEncKey: string;
  @Prop() sessionStart: Date;
  // LoRaWAN configuration
  @Prop({ default: 'EU_863_870' }) frequencyPlan: string;
  @Prop({ default: '1.0.3' }) lorawanVersion: string;
  @Prop({ default: 'RP001_1_0_3' }) regionalParametersVersion: string;
  @Prop({ default: false }) supportsClassB: boolean;
  @Prop({ default: false }) supportsClassC: boolean;
  @Prop({ default: 'OTAA', enum: ['OTAA', 'ABP', 'Multicast'] }) activationMode: string;
  @Prop({ default: true }) resetsJoinNonces: boolean;
  // Sharing
  @Prop({ type: [CollaboratorSchema], default: [] }) collaborators: Collaborator[];
  @Prop({ type: [SharedCompanySchema], default: [] }) sharedCompanies: SharedCompany[];
  // Payload formatter
  @Prop({ default: 'none', enum: ['none', 'javascript', 'cayennelpp'] }) payloadFormatterType: string;
  @Prop() payloadFormatterCode: string;
}

export const EndDeviceSchema = SchemaFactory.createForClass(EndDevice);
