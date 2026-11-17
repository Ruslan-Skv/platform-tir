import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Inject, Logger, UnauthorizedException, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { UsersService } from '../../users/users.service';
import { RemoteHelpService, RemoteHelpSessionWithUsers } from './remote-help.service';

type AuthedSocket = Socket & { data: { userId?: string } };

function socketCorsOrigins(): string | string[] {
  const raw = process.env.CORS_ORIGIN || 'http://localhost:3000';
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length === 1 ? list[0] : list;
}

/**
 * Сигналинг WebRTC-помощи: приглашения, запросы и обмен offer/answer/ICE.
 * Комнаты: user:{id} — лично пользователю, helpers — всем суперадминам.
 */
@WebSocketGateway({
  namespace: '/remote-help',
  cors: {
    origin: socketCorsOrigins(),
    credentials: true,
  },
})
export class RemoteHelpGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RemoteHelpGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => RemoteHelpService))
    private readonly remoteHelpService: RemoteHelpService,
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
      if (user.role === 'SUPER_ADMIN') {
        await client.join('helpers');
      }
    } catch (err) {
      this.logger.warn(`Remote help socket rejected: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthedSocket) {
    const userId = client.data.userId;
    if (!userId) return;
    try {
      await this.remoteHelpService.endActiveSessionsForUser(userId, 'disconnect');
    } catch (err) {
      this.logger.warn(`Remote help disconnect cleanup failed: ${(err as Error).message}`);
    }
  }

  /** Ретрансляция WebRTC-сигналов (offer/answer/ICE) между участниками сессии. */
  @SubscribeMessage('help:signal')
  async onSignal(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { sessionId?: string; data?: unknown },
  ) {
    const userId = client.data.userId;
    const sessionId = body?.sessionId;
    if (!userId || !sessionId || !body?.data) return { ok: false };

    try {
      const { counterpartId } = await this.remoteHelpService.assertSignalAllowed(userId, sessionId);
      this.server.to(this.userRoom(counterpartId)).emit('help:signal', {
        sessionId,
        data: body.data,
      });
      return { ok: true };
    } catch (err) {
      this.logger.warn(`help:signal rejected: ${(err as Error).message}`);
      return { ok: false };
    }
  }

  /** Модалка сотруднику: суперадмин просит доступ к экрану. */
  emitInvite(session: RemoteHelpSessionWithUsers) {
    if (!this.server) return;
    this.server.to(this.userRoom(session.userId)).emit('help:invite', session);
  }

  /** Тост суперадминам: сотрудник запросил помощь. */
  emitRequest(session: RemoteHelpSessionWithUsers) {
    if (!this.server) return;
    this.server.to('helpers').emit('help:request', session);
  }

  /** Синхронизация статуса сессии всем заинтересованным комнатам. */
  emitSession(session: RemoteHelpSessionWithUsers) {
    if (!this.server) return;
    const payload = session;
    this.server.to(this.userRoom(session.userId)).emit('help:session', payload);
    if (session.adminId) {
      this.server.to(this.userRoom(session.adminId)).emit('help:session', payload);
    }
    // Запросы сотрудников до назначения суперадмина видны всем помощникам
    if (session.status === 'REQUESTED') {
      this.server.to('helpers').emit('help:session', payload);
    }
  }

  /** Разбор трансляции: остановить медиа у обоих участников. */
  emitEnded(session: RemoteHelpSessionWithUsers, reason: string) {
    if (!this.server) return;
    const payload = { sessionId: session.id, reason };
    this.server.to(this.userRoom(session.userId)).emit('help:ended', payload);
    if (session.adminId) {
      this.server.to(this.userRoom(session.adminId)).emit('help:ended', payload);
    }
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }
}
