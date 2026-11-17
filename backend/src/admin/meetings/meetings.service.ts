import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { AdminBellPushService } from '../../bell-push/admin-bell-push.service';
import { ADMIN_ROLES } from '../../common/config/admin-roles.config';
import { getIceServersFromEnv, IceServerConfig } from '../../common/utils/webrtc-ice.util';
import { PrismaService } from '../../database/prisma.service';
import { MeetingsGateway } from './meetings.gateway';
import { CreateMeetingDto, UpdateMeetingDto } from './dto/meetings.dto';

/** Максимум одновременных участников mesh-конференции (MEET_MAX_PARTICIPANTS, по умолчанию 8). */
const DEFAULT_MAX_PARTICIPANTS = 8;

const MEETING_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  jobTitle: true,
  avatar: true,
} as const;

const meetingInclude = {
  createdBy: { select: MEETING_USER_SELECT },
  participants: {
    include: { user: { select: MEETING_USER_SELECT } },
  },
} satisfies Prisma.MeetingInclude;

export type MeetingWithDetails = Prisma.MeetingGetPayload<{
  include: typeof meetingInclude;
}>;

export type MeetingPublicUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  jobTitle: string | null;
  avatar: string | null;
};

@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminBellPush: AdminBellPushService,
    @Inject(forwardRef(() => MeetingsGateway))
    private readonly gateway: MeetingsGateway,
  ) {}

  maxParticipants(): number {
    const raw = Number(process.env.MEET_MAX_PARTICIPANTS);
    return Number.isFinite(raw) && raw >= 2 ? Math.floor(raw) : DEFAULT_MAX_PARTICIPANTS;
  }

  /** Создание собрания: автор автоматически участник, остальным — колокольчик и push. */
  async create(userId: string, dto: CreateMeetingDto): Promise<MeetingWithDetails> {
    const title = dto.title?.trim();
    if (!title) {
      throw new BadRequestException('Укажите название собрания');
    }
    const scheduledAt = this.parseScheduledAt(dto.scheduledAt);
    const participantIds = await this.resolveParticipantIds(userId, dto.participantIds ?? []);

    const meeting = await this.prisma.meeting.create({
      data: {
        title,
        description: dto.description?.trim() || null,
        scheduledAt,
        createdById: userId,
        status: 'SCHEDULED',
        participants: {
          create: [{ userId }, ...participantIds.map((id) => ({ userId: id }))],
        },
      },
      include: meetingInclude,
    });

    await this.notifyParticipants(
      meeting,
      participantIds,
      'created',
      `Вас пригласили на онлайн-собрание «${meeting.title}»`,
      this.formatWhen(meeting),
    );
    return meeting;
  }

  async list(
    userId: string,
    filters: { scope?: 'upcoming' | 'past'; limit?: number },
  ): Promise<MeetingWithDetails[]> {
    const take = Math.min(filters.limit ?? 30, 100);
    const upcoming = filters.scope !== 'past';
    return this.prisma.meeting.findMany({
      where: {
        participants: { some: { userId } },
        status: upcoming ? { in: ['SCHEDULED', 'ACTIVE'] } : { in: ['ENDED', 'CANCELLED'] },
      },
      include: meetingInclude,
      orderBy: upcoming
        ? [{ scheduledAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'asc' }]
        : [{ endedAt: 'desc' }, { createdAt: 'desc' }],
      take,
    });
  }

  /** Открытые собрания текущего пользователя (восстановление UI после перезагрузки). */
  async listMine(userId: string): Promise<MeetingWithDetails[]> {
    return this.prisma.meeting.findMany({
      where: {
        participants: { some: { userId } },
        status: { in: ['SCHEDULED', 'ACTIVE'] },
      },
      include: meetingInclude,
      orderBy: [{ scheduledAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'asc' }],
      take: 50,
    });
  }

  async getOne(userId: string, meetingId: string): Promise<MeetingWithDetails> {
    const meeting = await this.getMeetingOrThrow(meetingId);
    this.assertParticipant(meeting, userId);
    return meeting;
  }

  /** Редактирование до начала (только автор): название, время, состав участников. */
  async update(
    userId: string,
    meetingId: string,
    dto: UpdateMeetingDto,
  ): Promise<MeetingWithDetails> {
    const meeting = await this.getMeetingOrThrow(meetingId);
    if (meeting.createdById !== userId) {
      throw new ForbiddenException('Редактировать собрание может только его автор');
    }
    if (meeting.status !== 'SCHEDULED') {
      throw new BadRequestException('Редактировать можно только запланированное собрание');
    }

    const data: Prisma.MeetingUpdateInput = {};
    if (dto.title !== undefined) {
      const title = dto.title.trim();
      if (!title) throw new BadRequestException('Название не может быть пустым');
      data.title = title;
    }
    if (dto.description !== undefined) {
      data.description = dto.description.trim() || null;
    }
    if (dto.scheduledAt !== undefined) {
      data.scheduledAt = this.parseScheduledAt(dto.scheduledAt);
    }

    let updated = await this.prisma.meeting.update({
      where: { id: meetingId },
      data,
      include: meetingInclude,
    });

    if (dto.participantIds !== undefined) {
      const participantIds = await this.resolveParticipantIds(userId, dto.participantIds);
      const existing = new Set(updated.participants.map((p) => p.userId));
      const keep = new Set([userId, ...participantIds]);
      await this.prisma.meetingParticipant.deleteMany({
        where: { meetingId, userId: { notIn: [...keep] } },
      });
      await this.prisma.meetingParticipant.createMany({
        data: participantIds
          .filter((id) => !existing.has(id))
          .map((id) => ({ meetingId, userId: id })),
        skipDuplicates: true,
      });
      updated = await this.prisma.meeting.findUniqueOrThrow({
        where: { id: meetingId },
        include: meetingInclude,
      });

      const added = participantIds.filter((id) => !existing.has(id));
      await this.notifyParticipants(
        updated,
        added,
        'created',
        `Вас пригласили на онлайн-собрание «${updated.title}»`,
        this.formatWhen(updated),
      );
    }

    return updated;
  }

  /** Отмена собрания автором (до начала или во время). */
  async cancel(userId: string, meetingId: string): Promise<MeetingWithDetails> {
    const meeting = await this.getMeetingOrThrow(meetingId);
    if (meeting.createdById !== userId) {
      throw new ForbiddenException('Отменить собрание может только его автор');
    }
    if (meeting.status !== 'SCHEDULED' && meeting.status !== 'ACTIVE') {
      throw new BadRequestException('Собрание уже завершено или отменено');
    }

    const updated = await this.prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'CANCELLED', endedAt: new Date() },
      include: meetingInclude,
    });

    const others = updated.participants.map((p) => p.userId).filter((id) => id !== userId);
    await this.notifyParticipants(
      updated,
      others,
      'cancelled',
      `Онлайн-собрание «${updated.title}» отменено`,
      null,
    );
    this.gateway.emitMeetingEnded(meetingId, 'cancelled');
    return updated;
  }

  /** REST-вход в комнату: помечает начало, возвращает ICE и снимок собрания. */
  async join(
    userId: string,
    meetingId: string,
  ): Promise<{ meeting: MeetingWithDetails; iceServers: IceServerConfig[] }> {
    const meeting = await this.getMeetingOrThrow(meetingId);
    const me = this.findParticipant(meeting, userId);
    if (!me) {
      throw new ForbiddenException('Вы не участник собрания');
    }
    if (meeting.status === 'ENDED') {
      throw new BadRequestException('Собрание уже завершено');
    }
    if (meeting.status === 'CANCELLED') {
      throw new BadRequestException('Собрание отменено');
    }
    if (
      !this.gateway.isUserInRoom(meetingId, userId) &&
      this.gateway.roomSize(meetingId) >= this.maxParticipants()
    ) {
      throw new BadRequestException(
        `Достигнут лимит одновременных участников (${this.maxParticipants()})`,
      );
    }

    const now = new Date();
    await this.prisma.meetingParticipant.update({
      where: { meetingId_userId: { meetingId, userId } },
      data: { joinedAt: me?.joinedAt ?? now, leftAt: null },
    });
    const started = await this.prisma.meeting.updateMany({
      where: { id: meetingId, status: 'SCHEDULED' },
      data: { status: 'ACTIVE', startedAt: now },
    });

    const updated = await this.prisma.meeting.findUniqueOrThrow({
      where: { id: meetingId },
      include: meetingInclude,
    });

    if (started.count > 0) {
      const others = updated.participants.map((p) => p.userId).filter((id) => id !== userId);
      await this.notifyParticipants(
        updated,
        others,
        'started',
        `Онлайн-собрание «${updated.title}» началось`,
        null,
      );
    }
    return { meeting: updated, iceServers: getIceServersFromEnv() };
  }

  /** Выход участника; когда комнату покидает последний — собрание завершается. */
  async markLeft(userId: string, meetingId: string): Promise<void> {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) return;
    if (meeting.status !== 'ACTIVE') return;

    await this.prisma.meetingParticipant
      .update({
        where: { meetingId_userId: { meetingId, userId } },
        data: { leftAt: new Date() },
      })
      .catch(() => {
        /* участник мог быть удалён при редактировании состава */
      });

    if (this.gateway.roomSize(meetingId, userId) === 0) {
      await this.prisma.meeting.update({
        where: { id: meetingId },
        data: { status: 'ENDED', endedAt: new Date() },
      });
      this.gateway.emitMeetingEnded(meetingId, 'left');
    }
  }

  /** Лёгкая проверка для сокет-подключения к комнате (один раз на join). */
  async assertCanJoin(
    userId: string,
    meetingId: string,
  ): Promise<{ meeting: MeetingWithDetails; me: MeetingPublicUser }> {
    const meeting = await this.getMeetingOrThrow(meetingId);
    const me = this.findParticipant(meeting, userId);
    if (!me) {
      throw new ForbiddenException('Вы не участник собрания');
    }
    if (meeting.status !== 'SCHEDULED' && meeting.status !== 'ACTIVE') {
      throw new ForbiddenException('Собрание уже не активно');
    }
    return { meeting, me: me.user };
  }

  getIceServers(): IceServerConfig[] {
    return getIceServersFromEnv();
  }

  /** Колокольчик + web-push списку участников. */
  private async notifyParticipants(
    meeting: MeetingWithDetails,
    userIds: string[],
    kind: 'created' | 'started' | 'cancelled',
    message: string,
    when: string | null,
  ): Promise<void> {
    const targets = [...new Set(userIds.filter(Boolean))];
    if (targets.length === 0) return;

    const href = `/admin/meetings?join=${meeting.id}`;
    await this.prisma.meetingBellEvent.createMany({
      data: targets.map((userId) => ({
        userId,
        meetingId: meeting.id,
        kind,
        title: meeting.title,
        message: when ? `${message} · ${when}` : message,
        href,
      })),
    });
    await this.adminBellPush.notifyUsers(targets, 'meeting', {
      title: 'Онлайн-собрание',
      body: when ? `${message} · ${when}` : message,
      url: href,
      tag: `meeting-${kind}-${meeting.id}`,
    });
  }

  /** Валидация списка приглашённых: активные сотрудники админки без дублей, в пределах лимита. */
  private async resolveParticipantIds(authorId: string, raw: string[]): Promise<string[]> {
    const ids = [...new Set(raw.map((id) => id.trim()).filter((id) => id && id !== authorId))];
    if (ids.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: { id: { in: ids }, isActive: true, role: { in: ADMIN_ROLES } },
      select: { id: true },
    });
    if (users.length !== ids.length) {
      throw new BadRequestException(
        'Некоторые участники недоступны (деактивированы или не сотрудники админки)',
      );
    }
    if (ids.length + 1 > this.maxParticipants()) {
      throw new BadRequestException(
        `Максимум ${this.maxParticipants()} участников вместе с автором`,
      );
    }
    return ids;
  }

  private parseScheduledAt(raw?: string): Date | null {
    if (!raw) return null;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Некорректное время начала');
    }
    return date;
  }

  private formatWhen(meeting: { scheduledAt: Date | null }): string | null {
    if (!meeting.scheduledAt) return 'прямо сейчас';
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(meeting.scheduledAt);
  }

  private async getMeetingOrThrow(meetingId: string): Promise<MeetingWithDetails> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: meetingInclude,
    });
    if (!meeting) throw new NotFoundException('Собрание не найдено');
    return meeting;
  }

  private findParticipant(
    meeting: MeetingWithDetails,
    userId: string,
  ): MeetingWithDetails['participants'][number] | null {
    return meeting.participants.find((p) => p.userId === userId) ?? null;
  }

  private assertParticipant(meeting: MeetingWithDetails, userId: string): void {
    if (!meeting.participants.some((p) => p.userId === userId)) {
      throw new ForbiddenException('Вы не участник собрания');
    }
  }
}
