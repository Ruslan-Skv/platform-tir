import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

export type AdminBellContractConcludedNotification = {
  id: string;
  kind: 'REPAIR' | 'WINDOWS' | 'DOORS' | 'CEILINGS' | 'BLINDS' | 'FURNITURE';
  kindLabel: string;
  packageId: string;
  title: string;
  message: string;
  href: string;
  occurredAt: string;
};

const KIND_LABELS: Record<AdminBellContractConcludedNotification['kind'], string> = {
  REPAIR: 'Ремонт',
  WINDOWS: 'Окна',
  DOORS: 'Двери',
  CEILINGS: 'Потолки',
  BLINDS: 'Жалюзи',
  FURNITURE: 'Мебель',
};

const ALL_KINDS = ['REPAIR', 'WINDOWS', 'DOORS', 'CEILINGS', 'BLINDS', 'FURNITURE'] as const;

@Injectable()
export class AdminBellContractConcludedFeedService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(
    userId: string,
    limit = 20,
    kinds?: readonly string[],
  ): Promise<AdminBellContractConcludedNotification[]> {
    const since = new Date();
    since.setDate(since.getDate() - 14);

    // kinds позволяет колокольчику запросить только направления включённых настроек.
    const kindFilter = (kinds ?? []).filter(
      (kind): kind is AdminBellContractConcludedNotification['kind'] =>
        (ALL_KINDS as readonly string[]).includes(kind),
    );

    const rows = await this.prisma.contractConcludedBellEvent.findMany({
      where: {
        recipientId: userId,
        createdAt: { gte: since },
        ...(kindFilter.length > 0 ? { kind: { in: kindFilter } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(50, Math.max(1, limit)),
    });

    return rows.map((row) => {
      const kind = (
        (ALL_KINDS as readonly string[]).includes(row.kind) ? row.kind : 'REPAIR'
      ) as AdminBellContractConcludedNotification['kind'];
      return {
        id: row.id,
        kind,
        kindLabel: KIND_LABELS[kind],
        packageId: row.packageId,
        title: row.title,
        message: row.message,
        href: row.href,
        occurredAt: row.createdAt.toISOString(),
      };
    });
  }
}
