import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

export type AdminBellSalesTotalsNotification = {
  id: string;
  periodMonth: string;
  millions: number;
  title: string;
  message: string;
  href: string;
  occurredAt: string;
};

/** Фид событий «Итоги продаж — N млн ₽» для колокольчика (личные события за 14 дней). */
@Injectable()
export class AdminBellSalesTotalsFeedService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, limit = 20): Promise<AdminBellSalesTotalsNotification[]> {
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const rows = await this.prisma.salesTotalBellEvent.findMany({
      where: {
        recipientId: userId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(50, Math.max(1, limit)),
    });

    return rows.map((row) => ({
      id: row.id,
      periodMonth: row.periodMonth,
      millions: row.millions,
      title: row.title,
      message: row.message,
      href: row.href,
      occurredAt: row.createdAt.toISOString(),
    }));
  }
}
