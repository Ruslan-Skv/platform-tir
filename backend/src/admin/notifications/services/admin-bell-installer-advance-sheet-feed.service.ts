import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

export type AdminBellInstallerAdvanceSheetNotification = {
  id: string;
  sheetId: string;
  title: string;
  message: string;
  href: string;
  occurredAt: string;
};

/** Фид событий «создана ведомость авансов монтажника» для колокольчика (лично). */
@Injectable()
export class AdminBellInstallerAdvanceSheetFeedService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(
    userId: string,
    limit = 20,
  ): Promise<AdminBellInstallerAdvanceSheetNotification[]> {
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const rows = await this.prisma.installerAdvanceSheetBellEvent.findMany({
      where: {
        recipientId: userId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(50, Math.max(1, limit)),
    });

    return rows.map((row) => ({
      id: row.id,
      sheetId: row.sheetId,
      title: row.title,
      message: row.message,
      href: row.href,
      occurredAt: row.createdAt.toISOString(),
    }));
  }
}
