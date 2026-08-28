import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export type AdminBellKanbanNotification = {
  id: string;
  kind: 'assigned' | 'moved' | 'commented' | 'due_changed' | 'priority';
  kindLabel: string;
  cardId: string;
  title: string;
  message: string;
  href: string;
  occurredAt: string;
};

const KIND_LABELS: Record<string, string> = {
  assigned: 'Назначение',
  moved: 'Перемещение',
  commented: 'Комментарий',
  due_changed: 'Срок',
  priority: 'Приоритет',
};

@Injectable()
export class AdminBellKanbanFeedService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, limit = 20): Promise<AdminBellKanbanNotification[]> {
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const rows = await this.prisma.kanbanCardBellEvent.findMany({
      where: {
        recipientId: userId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(50, Math.max(1, limit)),
    });

    return rows.map((row) => ({
      id: row.id,
      kind: row.kind as AdminBellKanbanNotification['kind'],
      kindLabel: KIND_LABELS[row.kind] || 'Канбан',
      cardId: row.cardId,
      title: row.title,
      message: row.message,
      href: row.href,
      occurredAt: row.createdAt.toISOString(),
    }));
  }
}
