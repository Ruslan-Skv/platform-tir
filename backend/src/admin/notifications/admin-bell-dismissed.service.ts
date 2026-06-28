import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const MAX_DISMISSED_KEYS = 1500;
const KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*:.+$/;

@Injectable()
export class AdminBellDismissedService {
  constructor(private readonly prisma: PrismaService) {}

  async listKeys(userId: string): Promise<string[]> {
    const rows = await this.prisma.adminBellDismissedNotification.findMany({
      where: { userId },
      orderBy: { dismissedAt: 'desc' },
      take: MAX_DISMISSED_KEYS,
      select: { key: true },
    });
    return rows.map((row) => row.key);
  }

  async dismiss(userId: string, keys: string[]): Promise<{ added: number }> {
    const normalized = [...new Set(keys.map((key) => key.trim()).filter(Boolean))];
    for (const key of normalized) {
      if (key.length > 200 || !KEY_PATTERN.test(key)) {
        throw new BadRequestException(`Некорректный ключ уведомления: ${key}`);
      }
    }
    if (normalized.length === 0) return { added: 0 };

    await this.prisma.$transaction(
      normalized.map((key) =>
        this.prisma.adminBellDismissedNotification.upsert({
          where: { userId_key: { userId, key } },
          create: { userId, key },
          update: { dismissedAt: new Date() },
        }),
      ),
    );

    await this.pruneOldEntries(userId);

    return { added: normalized.length };
  }

  private async pruneOldEntries(userId: string) {
    const count = await this.prisma.adminBellDismissedNotification.count({ where: { userId } });
    if (count <= MAX_DISMISSED_KEYS) return;

    const excess = count - MAX_DISMISSED_KEYS;
    const oldest = await this.prisma.adminBellDismissedNotification.findMany({
      where: { userId },
      orderBy: { dismissedAt: 'asc' },
      take: excess,
      select: { id: true },
    });
    if (oldest.length === 0) return;

    await this.prisma.adminBellDismissedNotification.deleteMany({
      where: { id: { in: oldest.map((row) => row.id) } },
    });
  }
}
