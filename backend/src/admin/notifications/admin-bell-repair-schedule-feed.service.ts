import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export type AdminBellRepairScheduleNotification = {
  id: string;
  kind: 'created' | 'updated' | 'status_changed' | 'entry_added';
  kindLabel: string;
  repairScheduleProjectId: string;
  title: string;
  message: string;
  href: string;
  occurredAt: string;
};

const KIND_LABELS: Record<AdminBellRepairScheduleNotification['kind'], string> = {
  created: 'Новый график ремонта',
  updated: 'Правка графика ремонта',
  status_changed: 'Изменён статус ремонта',
  entry_added: 'Добавлена запись в график ремонта',
};

@Injectable()
export class AdminBellRepairScheduleFeedService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, limit = 20): Promise<AdminBellRepairScheduleNotification[]> {
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const rows = await this.prisma.repairScheduleBellEvent.findMany({
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
      ) as AdminBellRepairScheduleNotification['kind'];
      return {
        id: row.id,
        kind,
        kindLabel: KIND_LABELS[kind],
        repairScheduleProjectId: row.repairScheduleProjectId,
        title: row.title,
        message: row.message,
        href: row.href,
        occurredAt: row.createdAt.toISOString(),
      };
    });
  }
}
