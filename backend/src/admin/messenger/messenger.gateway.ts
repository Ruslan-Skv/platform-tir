import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Inject, Logger, UnauthorizedException, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../database/prisma.service';
import { UsersService } from '../../users/users.service';
import { MessengerService } from './messenger.service';

type AuthedSocket = Socket & { data: { userId?: string } };

function socketCorsOrigins(): string | string[] {
  const raw = process.env.CORS_ORIGIN || 'http://localhost:3000';
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length === 1 ? list[0] : list;
}

@WebSocketGateway({
  namespace: '/messenger',
  cors: {
    origin: socketCorsOrigins(),
    credentials: true,
  },
})
export class MessengerGateway implements OnGatewayConnection {
  private readonly logger = new Logger(MessengerGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MessengerService))
    private readonly messengerService: MessengerService,
  ) {}

  async handleConnection(client: AuthedSocket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ||
        (typeof client.handshake.headers.authorization === 'string'
          ? client.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
          : undefined);

      if (!token) {
        throw new UnauthorizedException('Нет токена');
      }

      const payload = this.jwtService.verify<{ sub: string }>(token);
      const user = await this.usersService.findOne(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Пользователь не найден');
      }

      client.data.userId = user.id;
      await client.join(this.userRoom(user.id));
    } catch (err) {
      this.logger.warn(`Messenger socket rejected: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  @SubscribeMessage('conversation:join')
  async onJoin(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId?: string },
  ) {
    const userId = client.data.userId;
    const conversationId = body?.conversationId;
    if (!userId || !conversationId) return { ok: false };

    try {
      await this.messengerService.assertMembership(userId, conversationId);
      await client.join(this.conversationRoom(conversationId));
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  @SubscribeMessage('conversation:leave')
  async onLeave(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId?: string },
  ) {
    const conversationId = body?.conversationId;
    if (!conversationId) return { ok: false };
    await client.leave(this.conversationRoom(conversationId));
    return { ok: true };
  }

  emitMessageNew(conversationId: string, message: unknown) {
    if (!this.server) return;
    this.server.to(this.conversationRoom(conversationId)).emit('message:new', message);
  }

  emitConversationUpdated(conversationId: string, payload: unknown) {
    if (!this.server) return;
    this.server.to(this.conversationRoom(conversationId)).emit('conversation:updated', payload);
    void this.emitToMemberUserRooms(conversationId, 'conversation:updated', payload);
  }

  private async emitToMemberUserRooms(conversationId: string, event: string, payload: unknown) {
    if (!this.server) return;
    try {
      const members = await this.prisma.messengerMember.findMany({
        where: { conversationId },
        select: { userId: true },
      });
      for (const m of members) {
        this.server.to(this.userRoom(m.userId)).emit(event, payload);
      }
    } catch (err) {
      this.logger.warn(`emitToMemberUserRooms failed: ${(err as Error).message}`);
    }
  }

  private conversationRoom(conversationId: string) {
    return `conversation:${conversationId}`;
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }
}
