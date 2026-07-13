import { Injectable } from '@nestjs/common';
import { WorkDayCloseReason, WorkDayStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export type WorkDayBellKind = 'late' | 'early_leave' | 'auto_closed' | 'reported_close';

export type AdminBellWorkDayNotification = {
  id: string;
  kind: WorkDayBellKind;
  kindLabel: string;
  workDayId: string;
  userId: string;
  userName: string;
  workDate: string;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  occurredAt: string;
};

const KIND_LABELS: Record<WorkDayBellKind, string> = {
  late: 'Опоздание',
  early_leave: 'Ранний уход',
  auto_closed: 'Автозакрытие',
  reported_close: 'Указано время ухода',
};

@Injectable()
export class AdminBellWorkDayFeedService {
  constructor(private readonly prisma: PrismaService) {}

  async listRecent(limit = 20): Promise<AdminBellWorkDayNotification[]> {
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const rows = await this.prisma.workDay.findMany({
      where: {
        OR: [
          { lateMinutes: { gt: 0 }, notifiedLateAt: { not: null } },
          { earlyLeaveMinutes: { gt: 0 }, notifiedEarlyLeaveAt: { not: null } },
          { status: WorkDayStatus.AUTO_CLOSED, notifiedAutoClosedAt: { not: null } },
          {
            closeReason: WorkDayCloseReason.REPORTED_NEXT_DAY,
            notifiedReportedCloseAt: { not: null },
          },
        ],
        updatedAt: { gte: since },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit * 4,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    const items: AdminBellWorkDayNotification[] = [];
    for (const row of rows) {
      const userName =
        [row.user.firstName, row.user.lastName].filter(Boolean).join(' ').trim() || row.user.email;
      const workDate = row.workDate.toISOString().slice(0, 10);

      if (row.lateMinutes > 0 && row.notifiedLateAt) {
        items.push(
          this.mapItem('late', row.id, row.userId, userName, workDate, row, row.notifiedLateAt),
        );
      }
      if (row.earlyLeaveMinutes > 0 && row.notifiedEarlyLeaveAt) {
        items.push(
          this.mapItem(
            'early_leave',
            row.id,
            row.userId,
            userName,
            workDate,
            row,
            row.notifiedEarlyLeaveAt,
          ),
        );
      }
      if (row.status === WorkDayStatus.AUTO_CLOSED && row.notifiedAutoClosedAt) {
        items.push(
          this.mapItem(
            'auto_closed',
            row.id,
            row.userId,
            userName,
            workDate,
            row,
            row.notifiedAutoClosedAt,
          ),
        );
      }
      if (row.closeReason === WorkDayCloseReason.REPORTED_NEXT_DAY && row.notifiedReportedCloseAt) {
        items.push(
          this.mapItem(
            'reported_close',
            row.id,
            row.userId,
            userName,
            workDate,
            row,
            row.notifiedReportedCloseAt,
          ),
        );
      }
    }

    return items
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, limit);
  }

  private mapItem(
    kind: WorkDayBellKind,
    workDayId: string,
    userId: string,
    userName: string,
    workDate: string,
    row: { lateMinutes: number; earlyLeaveMinutes: number },
    occurredAt: Date,
  ): AdminBellWorkDayNotification {
    return {
      id: `${kind}:${workDayId}`,
      kind,
      kindLabel: KIND_LABELS[kind],
      workDayId,
      userId,
      userName,
      workDate,
      lateMinutes: row.lateMinutes,
      earlyLeaveMinutes: row.earlyLeaveMinutes,
      occurredAt: occurredAt.toISOString(),
    };
  }
}
