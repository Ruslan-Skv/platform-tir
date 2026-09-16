import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

export type AdminBellMeasurementNotification = {
  id: string;
  kind: 'created' | 'completed' | 'cancelled' | 'converted';
  kindLabel: string;
  measurementId: string;
  title: string;
  message: string;
  href: string;
  occurredAt: string;
};

const KIND_LABELS: Record<AdminBellMeasurementNotification['kind'], string> = {
  created: 'Новый замер',
  completed: 'Выполнен',
  cancelled: 'Отказ',
  converted: 'Договор',
};

@Injectable()
export class AdminBellMeasurementFeedService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, limit = 20): Promise<AdminBellMeasurementNotification[]> {
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const rows = await this.prisma.measurementBellEvent.findMany({
      where: {
        recipientId: userId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(50, Math.max(1, limit)),
    });

    return rows.map((row) => {
      const kind = (
        ['created', 'completed', 'cancelled', 'converted'].includes(row.kind) ? row.kind : 'created'
      ) as AdminBellMeasurementNotification['kind'];
      return {
        id: row.id,
        kind,
        kindLabel: KIND_LABELS[kind],
        measurementId: row.measurementId,
        title: row.title,
        message: row.message,
        href: row.href,
        occurredAt: row.createdAt.toISOString(),
      };
    });
  }
}
