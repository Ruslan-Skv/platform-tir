import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export type AdminBellMessengerNotification = {
  id: string;
  kind: 'message';
  kindLabel: string;
  messageId: string;
  title: string;
  message: string;
  href: string;
  occurredAt: string;
};

@Injectable()
export class AdminBellMessengerFeedService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, limit = 20): Promise<AdminBellMessengerNotification[]> {
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const rows = await this.prisma.messengerMessageBellEvent.findMany({
      where: {
        recipientId: userId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(50, Math.max(1, limit)),
    });

    return rows.map((row) => ({
      id: row.id,
      kind: 'message' as const,
      kindLabel: 'Мессенджер',
      messageId: row.messageId,
      title: row.title,
      message: row.message,
      href: row.href,
      occurredAt: row.createdAt.toISOString(),
    }));
  }
}
