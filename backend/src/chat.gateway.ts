import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { AuthService } from './auth.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private chatService: ChatService, private authService: AuthService) {}
  private readonly logger = new Logger(ChatGateway.name);

  handleConnection(client: Socket) {
    const token = (client.handshake && (client.handshake.auth as any)?.token) || null;
    if (!token) {
      this.logger.warn(`Client ${client.id} connected without token; disconnecting`);
      client.disconnect();
      return;
    }
    const decoded: any = this.authService.verifyToken(token);
    if (!decoded) {
      this.logger.warn(`Client ${client.id} provided invalid token; disconnecting`);
      client.disconnect();
      return;
    }
    (client as any).data = (client as any).data || {};
    (client as any).data.userId = decoded.userId;
    (client as any).data.username = decoded.username;
    this.logger.debug(`Client ${client.id} authenticated as user ${decoded.userId}`);
  }

  handleDisconnect(client: Socket) {
    try {
      const userId = (client as any).data?.userId;
      if (!userId) return;
      for (const room of client.rooms) {
        if (room.startsWith('room_')) {
          const roomId = parseInt(room.replace('room_', ''), 10);
          if (!Number.isNaN(roomId)) {
            this.chatService.userLeft(roomId, userId);
          }
        }
      }
    } catch (err) {
    }
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    const roomKey = `room_${data.roomId}`;
    client.join(roomKey);
    const userId = (client as any).data?.userId;
    if (userId) {
      this.chatService.userJoined(data.roomId, userId);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    const { roomId, content } = data;
    const userId = (client as any).data?.userId;
    const senderName = (client as any).data?.username || 'unknown';
    if (!userId) return;

    const message = await this.chatService.saveMessage(roomId, userId, content, senderName);

    const roomKey = `room_${roomId}`;
    this.server.to(roomKey).emit('newMessage', {
      ...message,
      username: senderName,
    });
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    const roomKey = `room_${data.roomId}`;
    client.leave(roomKey);
    const userId = (client as any).data?.userId;
    if (userId) this.chatService.userLeft(data.roomId, userId);
  }
}
