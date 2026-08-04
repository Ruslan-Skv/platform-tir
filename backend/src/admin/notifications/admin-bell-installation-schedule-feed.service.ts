import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export type AdminBellInstallationScheduleNotification = {
  id: string;
  kind: 'created' | 'updated' | 'completed' | 'failed';
  kindLabel: string;
  installationScheduleId: string;
  title: string;
  message: string;
  href: string;
  occurredAt: string;
};

const KIND_LABELS: Record<AdminBellInstallationScheduleNotification['kind'], string> = {
  created: 'Новый монтаж',
  updated: 'Правка монтажа',
  completed: 'Выполнено',
  failed: 'Не выполнено',
};

@Injectable()
export class AdminBellInstallationScheduleFeedService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(
    userId: string,
    limit = 20,
  ): Promise<AdminBellInstallationScheduleNotification[]> {
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const rows = await this.prisma.installationScheduleBellEvent.findMany({
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
      ) as AdminBellInstallationScheduleNotification['kind'];
      return {
        id: row.id,
        kind,
        kindLabel: KIND_LABELS[kind],
        installationScheduleId: row.installationScheduleId,
        title: row.title,
        message: row.message,
        href: row.href,
        occurredAt: row.createdAt.toISOString(),
      };
    });
  }
}
