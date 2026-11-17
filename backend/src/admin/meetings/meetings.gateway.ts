import {
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
  UnauthorizedException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UsersService } from '../../users/users.service';
import { MeetingsService, MeetingPublicUser } from './meetings.service';

type AuthedSocket = Socket & { data: { userId?: string; meetingId?: string } };

/** Снимок участника комнаты: socketId для адресной доставки + карточка для UI. */
interface RoomMember {
  socketId: string;
  user: MeetingPublicUser;
}

function socketCorsOrigins(): string | string[] {
  const raw = process.env.CORS_ORIGIN || 'http://localhost:3000';
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length === 1 ? list[0] : list;
}

/**
 * Сигналинг mesh-конференций: комнаты meeting:{id}, обмен offer/answer/ICE,
 * чат и статусы медиа. Состав комнат — in-memory реестр (один инстанс backend),
 * поэтому проверка участия в сигналинге не ходит в БД на каждое сообщение.
 */
@WebSocketGateway({
  namespace: '/meetings',
  cors: {
    origin: socketCorsOrigins(),
    credentials: true,
  },
})
export class MeetingsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(MeetingsGateway.name);

  /** meetingId → (userId → участник). */
  private readonly rooms = new Map<string, Map<string, RoomMember>>();

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => MeetingsService))
    private readonly meetingsService: MeetingsService,
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
    } catch (err) {
      this.logger.warn(`Meetings socket rejected: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthedSocket) {
    const userId = client.data.userId;
    const meetingId = client.data.meetingId;
    if (!userId || !meetingId) return;

    const room = this.rooms.get(meetingId);
    if (!room) return;
    const member = room.get(userId);
    if (!member || member.socketId !== client.id) return; // сокет заменён повторным join

    room.delete(userId);
    if (room.size === 0) {
      this.rooms.delete(meetingId);
    }
    this.server.to(this.roomName(meetingId)).emit('meeting:peer-left', { meetingId, userId });
    try {
      await this.meetingsService.markLeft(userId, meetingId);
    } catch (err) {
      this.logger.warn(`Meetings markLeft failed: ${(err as Error).message}`);
    }
  }

  /** Вход в комнату: ack со списком уже подключённых пиров, остальным — peer-joined. */
  @SubscribeMessage('meeting:join')
  async onJoin(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { meetingId?: string },
  ) {
    const userId = client.data.userId;
    const meetingId = body?.meetingId;
    if (!userId || !meetingId) return { ok: false, error: 'bad-request' };

    try {
      const { me } = await this.meetingsService.assertCanJoin(userId, meetingId);

      let room = this.rooms.get(meetingId);
      if (!room) {
        room = new Map();
        this.rooms.set(meetingId, room);
      }

      // Один сокет на пользователя в комнате: повторный join (новая вкладка) выталкивает старый.
      const prev = room.get(userId);
      if (prev && prev.socketId !== client.id) {
        this.server.to(prev.socketId).emit('meeting:kicked', {
          meetingId,
          reason: 'joined-elsewhere',
        });
        this.server.in(prev.socketId).disconnectSockets(true);
      }

      const peers = [...room.values()].map((m) => m.user);
      room.set(userId, { socketId: client.id, user: me });
      client.data.meetingId = meetingId;
      await client.join(this.roomName(meetingId));

      this.server
        .to(this.roomName(meetingId))
        .except(client.id)
        .emit('meeting:peer-joined', { meetingId, user: me });

      return { ok: true, peers, me };
    } catch (err) {
      const error =
        err instanceof NotFoundException
          ? 'not-found'
          : err instanceof ForbiddenException
            ? 'forbidden'
            : err instanceof BadRequestException
              ? 'not-active'
              : 'error';
      return { ok: false, error };
    }
  }

  /** Адресная ретрансляция WebRTC-сигналов (offer/answer/ICE) между пирами комнаты. */
  @SubscribeMessage('meeting:signal')
  onSignal(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { meetingId?: string; toUserId?: string; data?: unknown },
  ) {
    const userId = client.data.userId;
    const { meetingId, toUserId, data } = body ?? {};
    if (!userId || !meetingId || !toUserId || !data) return { ok: false };

    const room = this.rooms.get(meetingId);
    if (!room || !room.has(userId) || !room.has(toUserId)) return { ok: false };

    const target = room.get(toUserId);
    if (!target) return { ok: false };

    this.server.to(target.socketId).emit('meeting:signal', {
      meetingId,
      fromUserId: userId,
      data,
    });
    return { ok: true };
  }

  /** Эфемерный чат собрания (не сохраняется в БД). */
  @SubscribeMessage('meeting:chat')
  onChat(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { meetingId?: string; text?: string },
  ) {
    const userId = client.data.userId;
    const meetingId = client.data.meetingId;
    const text = body?.text?.trim().slice(0, 500);
    if (!userId || !meetingId || meetingId !== body?.meetingId || !text) return { ok: false };

    const room = this.rooms.get(meetingId);
    const member = room?.get(userId);
    if (!room || !member) return { ok: false };

    const name = [member.user.firstName, member.user.lastName].filter(Boolean).join(' ');
    this.server.to(this.roomName(meetingId)).emit('meeting:chat', {
      meetingId,
      userId,
      userName: name || member.user.email,
      text,
      at: new Date().toISOString(),
    });
    return { ok: true };
  }

  /** Статусы медиа участника (мьют/камера/экран) для индикаторов в UI. */
  @SubscribeMessage('meeting:media-state')
  onMediaState(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    body: { meetingId?: string; mic?: boolean; camera?: boolean; screen?: boolean },
  ) {
    const userId = client.data.userId;
    const meetingId = client.data.meetingId;
    if (!userId || !meetingId || meetingId !== body?.meetingId) return { ok: false };
    if (!this.rooms.get(meetingId)?.has(userId)) return { ok: false };

    this.server
      .to(this.roomName(meetingId))
      .except(client.id)
      .emit('meeting:media-state', {
        meetingId,
        userId,
        mic: body.mic ?? true,
        camera: body.camera ?? false,
        screen: body.screen ?? false,
      });
    return { ok: true };
  }

  /** Разбор собрания (отмена/завершение): всем участникам — событие конца. */
  emitMeetingEnded(meetingId: string, reason: string) {
    if (!this.server) return;
    this.rooms.delete(meetingId);
    this.server.to(this.roomName(meetingId)).emit('meeting:ended', { meetingId, reason });
  }

  /** Число подключённых участников (exceptUserId — исключить уходящего). */
  roomSize(meetingId: string, exceptUserId?: string): number {
    const room = this.rooms.get(meetingId);
    if (!room) return 0;
    if (!exceptUserId) return room.size;
    let count = 0;
    for (const userId of room.keys()) {
      if (userId !== exceptUserId) count += 1;
    }
    return count;
  }

  isUserInRoom(meetingId: string, userId: string): boolean {
    return this.rooms.get(meetingId)?.has(userId) ?? false;
  }

  private roomName(meetingId: string) {
    return `meeting:${meetingId}`;
  }
}
