import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

export type AdminBellIncassationNotification = {
  id: string;
  incassationId: string;
  title: string;
  message: string;
  href: string;
  occurredAt: string;
};

/** Фид событий инкассаций наличных для колокольчика (личные события за 14 дней). */
@Injectable()
export class AdminBellIncassationFeedService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, limit = 20): Promise<AdminBellIncassationNotification[]> {
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const rows = await this.prisma.managerIncassationBellEvent.findMany({
      where: {
        recipientId: userId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(50, Math.max(1, limit)),
    });

    return rows.map((row) => ({
      id: row.id,
      incassationId: row.incassationId,
      title: row.title,
      message: row.message,
      href: row.href,
      occurredAt: row.createdAt.toISOString(),
    }));
  }
}
