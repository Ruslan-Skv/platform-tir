import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import type { AdminBellNotificationHistoryItemDto } from '../dto/save-admin-bell-notification-history.dto';

const KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*:.+$/;

@Injectable()
export class AdminBellHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async saveMany(
    userId: string,
    items: AdminBellNotificationHistoryItemDto[],
  ): Promise<{ added: number }> {
    const seen = new Set<string>();
    const normalized = items.filter((item) => {
      const key = item.key?.trim();
      if (!key || key.length > 200 || !KEY_PATTERN.test(key)) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (normalized.length === 0) return { added: 0 };

    for (const item of normalized) {
      if (!item.text?.trim()) {
        throw new BadRequestException('Текст уведомления не может быть пустым');
      }
    }

    await this.prisma.$transaction(
      normalized.map((item) =>
        this.prisma.adminBellNotificationHistory.upsert({
          where: { userId_key: { userId, key: item.key } },
          create: {
            userId,
            key: item.key,
            type: item.type,
            text: item.text.trim(),
            link: item.link?.trim() || null,
            occurredAt: item.occurredAt ? new Date(item.occurredAt) : new Date(),
          },
          update: {},
        }),
      ),
    );

    return { added: normalized.length };
  }

  async listForUser(userId: string, take: number) {
    const rows = await this.prisma.adminBellNotificationHistory.findMany({
      where: { userId },
      orderBy: { readAt: 'desc' },
      take,
      select: {
        key: true,
        type: true,
        text: true,
        link: true,
        occurredAt: true,
        readAt: true,
      },
    });
    return rows;
  }
}
