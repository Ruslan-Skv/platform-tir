import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export type AdminBellFurnitureScheduleNotification = {
  id: string;
  kind: 'created' | 'updated' | 'status_changed' | 'entry_added';
  kindLabel: string;
  furnitureScheduleProjectId: string;
  title: string;
  message: string;
  href: string;
  occurredAt: string;
};

const KIND_LABELS: Record<AdminBellFurnitureScheduleNotification['kind'], string> = {
  created: 'Новый график мебели',
  updated: 'Правка графика мебели',
  status_changed: 'Изменён статус мебели',
  entry_added: 'Добавлена запись в график мебели',
};

@Injectable()
export class AdminBellFurnitureScheduleFeedService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, limit = 20): Promise<AdminBellFurnitureScheduleNotification[]> {
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const rows = await this.prisma.furnitureScheduleBellEvent.findMany({
      where: {
        recipientId: userId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(50, Math.max(1, limit)),
    });

    return rows.map((row) => {
      const kind = (
        ['created', 'updated', 'status_changed', 'entry_added'].includes(row.kind)
          ? row.kind
          : 'updated'
      ) as AdminBellFurnitureScheduleNotification['kind'];
      return {
        id: row.id,
        kind,
        kindLabel: KIND_LABELS[kind],
        furnitureScheduleProjectId: row.furnitureScheduleProjectId,
        title: row.title,
        message: row.message,
        href: row.href,
        occurredAt: row.createdAt.toISOString(),
      };
    });
  }
}
