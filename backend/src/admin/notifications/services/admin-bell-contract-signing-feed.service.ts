import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

export type AdminBellContractSigningNotification = {
  id: string;
  kind: 'signed' | 'rejected' | 'viewed';
  kindLabel: string;
  packageId: string;
  sessionId: string;
  title: string;
  message: string;
  href: string;
  occurredAt: string;
};

const KIND_LABELS: Record<AdminBellContractSigningNotification['kind'], string> = {
  signed: 'Договоры подписаны',
  rejected: 'Подписание отклонено',
  viewed: 'Документы открыты клиентом',
};

@Injectable()
export class AdminBellContractSigningFeedService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, limit = 20): Promise<AdminBellContractSigningNotification[]> {
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const rows = await this.prisma.contractSigningBellEvent.findMany({
      where: {
        recipientId: userId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(50, Math.max(1, limit)),
    });

    return rows.map((row) => {
      const kind = (
        ['signed', 'rejected', 'viewed'].includes(row.kind) ? row.kind : 'viewed'
      ) as AdminBellContractSigningNotification['kind'];
      return {
        id: row.id,
        kind,
        kindLabel: KIND_LABELS[kind],
        packageId: row.packageId,
        sessionId: row.sessionId,
        title: row.title,
        message: row.message,
        href: row.href,
        occurredAt: row.createdAt.toISOString(),
      };
    });
  }
}
