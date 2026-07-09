import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, path: '/ws' })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(EventsGateway.name);

  constructor(private jwtService: JwtService, private config: ConfigService) {}

  handleConnection(client: Socket) {
    const token = client.handshake.query.token as string;
    try {
      this.jwtService.verify(token, { secret: this.config.get<string>('JWT_SECRET') });
      this.logger.log(`Client connected: ${client.id}`);
    } catch {
      this.logger.warn(`Rejected unauthenticated WebSocket: ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @OnEvent('uplink.received')
  handleUplinkReceived(uplink: any) {
    this.server.emit('uplink.received', uplink);
  }

  emitGatewayStatus(gateway: any) {
    this.server.emit('gateway.status', gateway);
  }

  emitDeviceStatus(device: any) {
    this.server.emit('device.status', device);
  }

  emitNotification(notification: any) {
    this.server.emit('notification.created', notification);
  }

  emitDownlinkSent(downlink: any) {
    this.server.emit('downlink.sent', downlink);
  }
}
