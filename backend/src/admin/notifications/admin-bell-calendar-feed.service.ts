import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export type AdminBellCalendarNotification = {
  id: string;
  kind: 'created';
  kindLabel: string;
  calendarEventId: string;
  title: string;
  message: string;
  href: string;
  occurredAt: string;
};

@Injectable()
export class AdminBellCalendarFeedService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, limit = 20): Promise<AdminBellCalendarNotification[]> {
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const rows = await this.prisma.calendarCustomEventBellEvent.findMany({
      where: {
        recipientId: userId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(50, Math.max(1, limit)),
    });

    return rows.map((row) => ({
      id: row.id,
      kind: 'created' as const,
      kindLabel: 'Событие календаря',
      calendarEventId: row.calendarEventId,
      title: row.title,
      message: row.message,
      href: row.href,
      occurredAt: row.createdAt.toISOString(),
    }));
  }
}
