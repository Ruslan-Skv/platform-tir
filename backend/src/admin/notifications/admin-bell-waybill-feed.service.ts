import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export type AdminBellWaybillNotification = {
  id: string;
  kind: 'created' | 'updated' | 'completed' | 'failed';
  kindLabel: string;
  waybillTaskId: string;
  title: string;
  message: string;
  href: string;
  occurredAt: string;
};

const KIND_LABELS: Record<AdminBellWaybillNotification['kind'], string> = {
  created: 'Новое задание',
  updated: 'Правка задания',
  completed: 'Выполнено',
  failed: 'Не выполнено',
};

@Injectable()
export class AdminBellWaybillFeedService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, limit = 20): Promise<AdminBellWaybillNotification[]> {
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const rows = await this.prisma.waybillTaskBellEvent.findMany({
      where: {
        recipientId: userId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(50, Math.max(1, limit)),
    });

    return rows.map((row) => {
      const kind = (
        ['created', 'updated', 'completed', 'failed'].includes(row.kind) ? row.kind : 'updated'
      ) as AdminBellWaybillNotification['kind'];
      return {
        id: row.id,
        kind,
        kindLabel: KIND_LABELS[kind],
        waybillTaskId: row.waybillTaskId,
        title: row.title,
        message: row.message,
        href: row.href,
        occurredAt: row.createdAt.toISOString(),
      };
    });
  }
}
