import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EndDevice, EndDeviceDocument } from './schemas/end-device.schema';
import { CreateEndDeviceDto } from './dto/create-end-device.dto';
import { UpdateEndDeviceDto } from './dto/update-end-device.dto';
import { SendDownlinkDto } from './dto/send-downlink.dto';
import { UpdateShareDto } from './dto/update-share.dto';
import { MqttService } from '../mqtt/mqtt.service';

@Injectable()
export class EndDevicesService {
  constructor(
    @InjectModel(EndDevice.name) private model: Model<EndDeviceDocument>,
    private mqttService: MqttService,
  ) {}

  create(dto: CreateEndDeviceDto) {
    if (dto.devAddr) dto.devAddr = dto.devAddr.toLowerCase();
    return new this.model(dto).save();
  }
  findAll() { return this.model.find().populate('applicationId', 'name').populate('companyId', 'name').exec(); }
  async findOne(id: string) {
    const doc = await this.model.findById(id).populate('applicationId', 'name').populate('companyId', 'name').exec();
    if (!doc) throw new NotFoundException('End device not found');
    return doc;
  }
  async update(id: string, dto: UpdateEndDeviceDto) {
    if (dto.devAddr) dto.devAddr = dto.devAddr.toLowerCase();
    const doc = await this.model.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!doc) throw new NotFoundException('End device not found');
    return doc;
  }
  async remove(id: string) {
    const doc = await this.model.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException('End device not found');
  }

  findByDevAddr(devAddr: string): Promise<EndDeviceDocument | null> {
    return this.model.findOne({ devAddr: devAddr.toLowerCase() }).exec();
  }

  findByDevEUI(devEUI: string): Promise<EndDeviceDocument | null> {
    return this.model.findOne({ devEUI: devEUI.toUpperCase() }).exec();
  }

  async updateOtaaSession(id: string, session: { devAddr: string; appSKey: string; nwkSKey: string; sessionStart: Date }) {
    await this.model.findByIdAndUpdate(id, {
      devAddr:      session.devAddr,
      appSKey:      session.appSKey,
      nwkSKey:      session.nwkSKey,
      sessionStart: session.sessionStart,
      status:       'active',
    }).exec();
  }

  async sendDownlink(id: string, dto: SendDownlinkDto) {
    const device = await this.model.findById(id).exec();
    if (!device) throw new NotFoundException('End device not found');
    // Publish downlink via MQTT (chirpstack format)
    const topic = `application/default/device/${device.devEUI}/command/down`;
    const payload = JSON.stringify({
      devEui: device.devEUI,
      confirmed: dto.confirmed ?? false,
      fPort: dto.fPort,
      data: dto.payload,
      ...(dto.retries !== undefined && { nFCntDown: dto.retries }),
    });
    this.mqttService.publish(topic, payload);
    return { queued: true, devEUI: device.devEUI, fPort: dto.fPort };
  }

  async updateShare(id: string, dto: UpdateShareDto) {
    const update: any = {};
    if (dto.collaborators !== undefined) update.collaborators = dto.collaborators;
    if (dto.sharedCompanies !== undefined) update.sharedCompanies = dto.sharedCompanies;
    const doc = await this.model.findByIdAndUpdate(id, update, { new: true })
      .populate('applicationId', 'name')
      .populate('companyId', 'name')
      .exec();
    if (!doc) throw new NotFoundException('End device not found');
    return doc;
  }

  async markSeen(devAddr: string, gatewayEUI: string, rssi: number, fCntUp?: number) {
    await this.model.findOneAndUpdate(
      { devAddr: devAddr.toLowerCase() },
      { $pull: { connectedGateways: { gatewayEUI } } },
    ).exec();
    const update: any = {
      lastSeen: new Date(),
      rssi,
      status: 'active',
      $push: { connectedGateways: { gatewayEUI, rssi } },
    };
    if (fCntUp !== undefined) update.fCntUp = fCntUp;
    await this.model.findOneAndUpdate(
      { devAddr: devAddr.toLowerCase() },
      update,
    ).exec();
  }
}
