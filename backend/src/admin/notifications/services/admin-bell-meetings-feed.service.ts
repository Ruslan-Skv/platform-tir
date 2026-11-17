import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

/** Строка фида колокольчика: событие собрания или напоминание «скоро начало». */
export type AdminBellMeetingsNotification = {
  id: string;
  kind: 'created' | 'started' | 'cancelled' | 'reminder';
  kindLabel: string;
  meetingId: string;
  title: string;
  message: string;
  href: string;
  occurredAt: string;
};

const KIND_LABELS: Record<AdminBellMeetingsNotification['kind'], string> = {
  created: 'Онлайн-собрание',
  started: 'Собрание началось',
  cancelled: 'Собрание отменено',
  reminder: 'Скоро собрание',
};

/** Окно напоминаний: за 15 минут до начала (и 5 минут после — ещё не поздно зайти). */
const REMINDER_BEFORE_MS = 15 * 60_000;
const REMINDER_AFTER_MS = 5 * 60_000;

@Injectable()
export class AdminBellMeetingsFeedService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, limit = 20): Promise<AdminBellMeetingsNotification[]> {
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const [rows, upcoming] = await Promise.all([
      this.prisma.meetingBellEvent.findMany({
        where: {
          userId,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(50, Math.max(1, limit)),
      }),
      this.prisma.meeting.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: {
            gte: new Date(Date.now() - REMINDER_AFTER_MS),
            lte: new Date(Date.now() + REMINDER_BEFORE_MS),
          },
          participants: { some: { userId } },
        },
      }),
    ]);

    const events: AdminBellMeetingsNotification[] = rows.map((row) => {
      const kind = (['created', 'started', 'cancelled'] as const).includes(
        row.kind as 'created' | 'started' | 'cancelled',
      )
        ? (row.kind as 'created' | 'started' | 'cancelled')
        : 'created';
      return {
        id: row.id,
        kind,
        kindLabel: KIND_LABELS[kind],
        meetingId: row.meetingId,
        title: row.title,
        message: row.message,
        href: row.href,
        occurredAt: row.createdAt.toISOString(),
      };
    });

    // Напоминания вычисляются на лету при опросе фида (клиент поллит раз в ~60с),
    // поэтому отдельный планировщик не нужен.
    for (const meeting of upcoming) {
      events.push({
        id: `meeting-reminder:${meeting.id}`,
        kind: 'reminder',
        kindLabel: KIND_LABELS.reminder,
        meetingId: meeting.id,
        title: meeting.title,
        message: `«${meeting.title}» начинается скоро — можно зайти`,
        href: `/admin/meetings?join=${meeting.id}`,
        occurredAt: (meeting.scheduledAt ?? meeting.createdAt).toISOString(),
      });
    }

    events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    return events.slice(0, Math.min(50, Math.max(1, limit)));
  }
}
