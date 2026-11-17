import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Prisma, RemoteHelpSessionStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UsersService } from '../../users/users.service';
import { RemoteHelpGateway } from './remote-help.gateway';
import { CreateRemoteHelpInviteDto } from './dto/remote-help.dto';

/** Не отвеченное приглашение/запрос живёт столько, потом помечается EXPIRED. */
const STALE_MS = 90_000;

const REMOTE_HELP_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  jobTitle: true,
  avatar: true,
} as const;

const sessionInclude = {
  user: { select: REMOTE_HELP_USER_SELECT },
  admin: { select: REMOTE_HELP_USER_SELECT },
} satisfies Prisma.RemoteHelpSessionInclude;

type RemoteHelpSessionWithUsers = Prisma.RemoteHelpSessionGetPayload<{
  include: typeof sessionInclude;
}>;

/** Конфигурация ICE-серверов для WebRTC (см. docs/REMOTE-HELP.md). */
export interface IceServerConfig {
  urls: string[];
  username?: string;
  credential?: string;
}

@Injectable()
export class RemoteHelpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => RemoteHelpGateway))
    private readonly gateway: RemoteHelpGateway,
  ) {}

  /** Суперадмин приглашает сотрудника. Если сотрудник уже запросил помощь — забираем его запрос. */
  async createInvite(
    adminId: string,
    dto: CreateRemoteHelpInviteDto,
  ): Promise<RemoteHelpSessionWithUsers> {
    if (adminId === dto.userId) {
      throw new BadRequestException('Нельзя пригласить самого себя');
    }
    const target = await this.usersService.findOne(dto.userId);
    if (!target.isActive) {
      throw new BadRequestException('Пользователь деактивирован');
    }
    if (target.role === 'USER' || target.role === 'GUEST') {
      throw new BadRequestException('Пользователь не является сотрудником админки');
    }

    await this.expireStale();
    await this.assertNoOpenSessions(dto.userId, adminId);

    const existingRequest = await this.prisma.remoteHelpSession.findFirst({
      where: { userId: dto.userId, status: 'REQUESTED' },
      include: sessionInclude,
    });

    const session = existingRequest
      ? await this.prisma.remoteHelpSession.update({
          where: { id: existingRequest.id },
          data: { adminId, status: 'PENDING' },
          include: sessionInclude,
        })
      : await this.prisma.remoteHelpSession.create({
          data: { userId: dto.userId, adminId, status: 'PENDING' },
          include: sessionInclude,
        });

    this.gateway.emitInvite(session);
    this.gateway.emitSession(session);
    return session;
  }

  /** Сотрудник сам запросил помощь. Идемпотентно: незакрытый запрос возвращается. */
  async createRequest(userId: string): Promise<RemoteHelpSessionWithUsers> {
    await this.expireStale();
    await this.assertNoOpenSessions(userId, userId);

    const existing = await this.prisma.remoteHelpSession.findFirst({
      where: { userId, status: { in: ['REQUESTED', 'PENDING', 'ACTIVE'] } },
      include: sessionInclude,
    });
    if (existing) return existing;

    const session = await this.prisma.remoteHelpSession.create({
      data: { userId, status: 'REQUESTED' },
      include: sessionInclude,
    });
    this.gateway.emitRequest(session);
    this.gateway.emitSession(session);
    return session;
  }

  /** Суперадмин принимает входящий запрос сотрудника — сотруднику уходит приглашение. */
  async claim(adminId: string, sessionId: string): Promise<RemoteHelpSessionWithUsers> {
    await this.expireStale();
    const session = await this.getSessionOrThrow(sessionId);
    if (session.status !== 'REQUESTED') {
      throw new BadRequestException('Запрос уже обработан');
    }

    const updated = await this.prisma.remoteHelpSession.update({
      where: { id: sessionId },
      data: { adminId, status: 'PENDING' },
      include: sessionInclude,
    });
    this.gateway.emitInvite(updated);
    this.gateway.emitSession(updated);
    return updated;
  }

  /** Сотрудник согласился: далее WebRTC-сигналинг через сокет. */
  async accept(userId: string, sessionId: string): Promise<RemoteHelpSessionWithUsers> {
    const session = await this.getSessionOrThrow(sessionId);
    this.assertWorker(userId, session);

    if (session.status === 'ACTIVE') return session;
    if (session.status !== 'PENDING') {
      throw new BadRequestException('Приглашение уже неактуально');
    }

    const updated = await this.prisma.remoteHelpSession.update({
      where: { id: sessionId },
      data: { status: 'ACTIVE', respondedAt: new Date(), startedAt: new Date() },
      include: sessionInclude,
    });
    this.gateway.emitSession(updated);
    return updated;
  }

  async decline(userId: string, sessionId: string): Promise<RemoteHelpSessionWithUsers> {
    const session = await this.getSessionOrThrow(sessionId);
    this.assertWorker(userId, session);
    if (session.status !== 'PENDING') {
      throw new BadRequestException('Приглашение уже неактуально');
    }

    const updated = await this.prisma.remoteHelpSession.update({
      where: { id: sessionId },
      data: {
        status: 'DECLINED',
        respondedAt: new Date(),
        endedAt: new Date(),
        endReason: 'declined',
      },
      include: sessionInclude,
    });
    this.gateway.emitSession(updated);
    return updated;
  }

  /** Суперадмин отменяет своё приглашение до ответа сотрудника. */
  async cancel(adminId: string, sessionId: string): Promise<RemoteHelpSessionWithUsers> {
    const session = await this.getSessionOrThrow(sessionId);
    this.assertAdmin(adminId, session);
    if (session.status !== 'PENDING' && session.status !== 'REQUESTED') {
      throw new BadRequestException('Сессия уже неактуальна');
    }

    const updated = await this.prisma.remoteHelpSession.update({
      where: { id: sessionId },
      data: { status: 'CANCELLED', endedAt: new Date(), endReason: 'cancelled' },
      include: sessionInclude,
    });
    this.gateway.emitSession(updated);
    return updated;
  }

  /** Завершение активной сессии любым из участников. */
  async end(
    byUserId: string,
    sessionId: string,
    reason: string,
  ): Promise<RemoteHelpSessionWithUsers> {
    const session = await this.getSessionOrThrow(sessionId);
    this.assertParticipant(byUserId, session);
    if (session.status !== 'ACTIVE') {
      throw new BadRequestException('Сессия не активна');
    }

    const updated = await this.prisma.remoteHelpSession.update({
      where: { id: sessionId },
      data: { status: 'ENDED', endedAt: new Date(), endReason: reason },
      include: sessionInclude,
    });
    this.gateway.emitEnded(updated, reason);
    this.gateway.emitSession(updated);
    return updated;
  }

  /** Серверное завершение (обрыв сокета / остановка шаринга) без REST-вызова участника. */
  async endActiveSessionsForUser(userId: string, reason: string): Promise<void> {
    const sessions = await this.prisma.remoteHelpSession.findMany({
      where: { status: 'ACTIVE', OR: [{ userId }, { adminId: userId }] },
      include: sessionInclude,
    });
    for (const session of sessions) {
      const updated = await this.prisma.remoteHelpSession.update({
        where: { id: session.id },
        data: { status: 'ENDED', endedAt: new Date(), endReason: reason },
        include: sessionInclude,
      });
      this.gateway.emitEnded(updated, reason);
      this.gateway.emitSession(updated);
    }
  }

  /** Проверяет право слать сигнальные сообщения и возвращает адресата (второго участника). */
  async assertSignalAllowed(
    userId: string,
    sessionId: string,
  ): Promise<{ session: RemoteHelpSessionWithUsers; counterpartId: string }> {
    const session = await this.getSessionOrThrow(sessionId);
    if (session.status !== 'ACTIVE') {
      throw new ForbiddenException('Сессия не активна');
    }
    if (session.userId === userId) return { session, counterpartId: session.adminId as string };
    if (session.adminId === userId) return { session, counterpartId: session.userId };
    throw new ForbiddenException('Нет доступа к сессии');
  }

  async listSessions(filters: {
    status?: RemoteHelpSessionStatus;
    userId?: string;
    limit?: number;
  }): Promise<RemoteHelpSessionWithUsers[]> {
    await this.expireStale();
    return this.prisma.remoteHelpSession.findMany({
      where: {
        status: filters.status,
        OR: filters.userId ? [{ userId: filters.userId }, { adminId: filters.userId }] : undefined,
      },
      include: sessionInclude,
      orderBy: { createdAt: 'desc' },
      take: Math.min(filters.limit ?? 50, 200),
    });
  }

  /** Открытые сессии для панели суперадмина: запросы сотрудников, приглашения, активные. */
  async listOpenSessions(): Promise<{
    requests: RemoteHelpSessionWithUsers[];
    invites: RemoteHelpSessionWithUsers[];
    active: RemoteHelpSessionWithUsers[];
  }> {
    await this.expireStale();
    const sessions = await this.prisma.remoteHelpSession.findMany({
      where: { status: { in: ['REQUESTED', 'PENDING', 'ACTIVE'] } },
      include: sessionInclude,
      orderBy: { createdAt: 'desc' },
    });
    return {
      requests: sessions.filter((s) => s.status === 'REQUESTED'),
      invites: sessions.filter((s) => s.status === 'PENDING'),
      active: sessions.filter((s) => s.status === 'ACTIVE'),
    };
  }

  /** Открытая сессия текущего пользователя (восстановление UI после перезагрузки вкладки). */
  async getMyOpenSession(userId: string): Promise<RemoteHelpSessionWithUsers | null> {
    await this.expireStale();
    return this.prisma.remoteHelpSession.findFirst({
      where: {
        status: { in: ['REQUESTED', 'PENDING', 'ACTIVE'] },
        OR: [{ userId }, { adminId: userId }],
      },
      include: sessionInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  getIceServers(): IceServerConfig[] {
    const servers: IceServerConfig[] = [];
    const turnUrl = process.env.TURN_URL;
    if (turnUrl) {
      servers.push({
        urls: turnUrl
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_CREDENTIAL,
      });
    }
    servers.push({ urls: ['stun:stun.l.google.com:19302'] });
    return servers;
  }

  /** Ленивая уборка: не отвеченные приглашения/запросы старше STALE_MS помечаем EXPIRED. */
  private async expireStale(): Promise<void> {
    const staleBefore = new Date(Date.now() - STALE_MS);
    const stale = await this.prisma.remoteHelpSession.findMany({
      where: {
        status: { in: ['REQUESTED', 'PENDING'] },
        createdAt: { lt: staleBefore },
      },
      include: sessionInclude,
    });
    for (const session of stale) {
      const updated = await this.prisma.remoteHelpSession.update({
        where: { id: session.id },
        data: { status: 'EXPIRED', endedAt: new Date(), endReason: 'timeout' },
        include: sessionInclude,
      });
      this.gateway.emitSession(updated);
    }
  }

  private async assertNoOpenSessions(userId: string, adminId: string): Promise<void> {
    const open = await this.prisma.remoteHelpSession.findFirst({
      where: {
        status: { in: ['REQUESTED', 'PENDING', 'ACTIVE'] },
        OR: [{ userId }, { adminId }],
      },
      select: { userId: true, adminId: true, status: true },
    });
    if (!open) return;
    if (open.status === 'REQUESTED') {
      throw new BadRequestException('У пользователя уже есть незакрытый запрос помощи');
    }
    throw new BadRequestException(
      open.status === 'ACTIVE'
        ? 'Сессия помощи уже идёт — завершите её прежде чем создавать новую'
        : 'Уже есть ожидающее ответа приглашение',
    );
  }

  private async getSessionOrThrow(sessionId: string): Promise<RemoteHelpSessionWithUsers> {
    const session = await this.prisma.remoteHelpSession.findUnique({
      where: { id: sessionId },
      include: sessionInclude,
    });
    if (!session) throw new NotFoundException('Сессия не найдена');
    return session;
  }

  private assertWorker(userId: string, session: RemoteHelpSessionWithUsers): void {
    if (session.userId !== userId) {
      throw new ForbiddenException('Это не ваша сессия');
    }
  }

  private assertAdmin(userId: string, session: RemoteHelpSessionWithUsers): void {
    if (session.adminId !== userId) {
      throw new ForbiddenException('Это не ваша сессия');
    }
  }

  private assertParticipant(userId: string, session: RemoteHelpSessionWithUsers): void {
    if (session.userId !== userId && session.adminId !== userId) {
      throw new ForbiddenException('Это не ваша сессия');
    }
  }
}

export type { RemoteHelpSessionWithUsers, REMOTE_HELP_USER_SELECT };
export type RemoteHelpUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  jobTitle: string | null;
  avatar: string | null;
};
