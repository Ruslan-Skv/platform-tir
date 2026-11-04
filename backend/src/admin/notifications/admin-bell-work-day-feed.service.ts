import { Injectable } from '@nestjs/common';
import {
  WorkDayCloseReason,
  WorkDayRequestStatus,
  WorkDayRequestType,
  WorkDayStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export type WorkDayBellKind =
  | 'late'
  | 'early_leave'
  | 'auto_closed'
  | 'reported_close'
  | 'day_off_request'
  | 'early_leave_request'
  | 'late_arrival_request'
  | 'sick_leave_request'
  | 'vacation_leave_request';

export type AdminBellWorkDayNotification = {
  id: string;
  kind: WorkDayBellKind;
  kindLabel: string;
  workDayId: string | null;
  requestId: string | null;
  userId: string;
  userName: string;
  workDate: string;
  /** Конец периода больничного/отпуска (для остальных событий — null). */
  requestDateTo: string | null;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  occurredAt: string;
};

/** Персональное уведомление сотруднику об ответе руководителя на его запрос. */
export type AdminBellWorkDayRequestReviewNotification = {
  id: string;
  requestId: string;
  status: 'approved' | 'rejected';
  requestType: WorkDayRequestType;
  requestTypeLabel: string;
  workDate: string;
  /** Конец периода больничного (для остальных типов — null). */
  requestDateTo: string | null;
  proposedEndTime: string | null;
  reviewComment: string | null;
  reviewedAt: string;
};

const KIND_LABELS: Record<WorkDayBellKind, string> = {
  late: 'Опоздание',
  early_leave: 'Ранний уход',
  auto_closed: 'Автозакрытие',
  reported_close: 'Указано время ухода',
  day_off_request: 'Запрос выходного',
  early_leave_request: 'Запрос уйти пораньше',
  late_arrival_request: 'Запрос прийти попозже',
  sick_leave_request: 'Запрос больничного',
  vacation_leave_request: 'Запрос отпуска',
};

const REQUEST_TYPE_LABELS: Record<WorkDayRequestType, string> = {
  DAY_OFF: 'Выходной',
  EARLY_LEAVE: 'Уйти пораньше',
  LATE_ARRIVAL: 'Прийти попозже',
  SICK_LEAVE: 'Больничный',
  VACATION_LEAVE: 'Отпуск',
};

const REQUEST_KIND_BY_TYPE: Record<WorkDayRequestType, WorkDayBellKind> = {
  DAY_OFF: 'day_off_request',
  EARLY_LEAVE: 'early_leave_request',
  LATE_ARRIVAL: 'late_arrival_request',
  SICK_LEAVE: 'sick_leave_request',
  VACATION_LEAVE: 'vacation_leave_request',
};

@Injectable()
export class AdminBellWorkDayFeedService {
  constructor(private readonly prisma: PrismaService) {}

  async listRecent(limit = 20): Promise<AdminBellWorkDayNotification[]> {
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const [rows, requests] = await Promise.all([
      this.prisma.workDay.findMany({
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
      }),
      this.prisma.workDayRequest.findMany({
        where: {
          status: WorkDayRequestStatus.PENDING,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
    ]);

    const items: AdminBellWorkDayNotification[] = [];
    for (const row of rows) {
      const userName =
        [row.user.firstName, row.user.lastName].filter(Boolean).join(' ').trim() || row.user.email;
      const workDate = row.workDate.toISOString().slice(0, 10);

      if (row.lateMinutes > 0 && row.notifiedLateAt) {
        items.push(
          this.mapWorkDayItem(
            'late',
            row.id,
            row.userId,
            userName,
            workDate,
            row,
            row.notifiedLateAt,
          ),
        );
      }
      if (row.earlyLeaveMinutes > 0 && row.notifiedEarlyLeaveAt) {
        items.push(
          this.mapWorkDayItem(
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
          this.mapWorkDayItem(
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
          this.mapWorkDayItem(
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

    for (const req of requests) {
      const userName =
        [req.user.firstName, req.user.lastName].filter(Boolean).join(' ').trim() || req.user.email;
      const workDate = req.requestDate.toISOString().slice(0, 10);
      const kind = REQUEST_KIND_BY_TYPE[req.type];
      items.push({
        id: `${kind}:${req.id}`,
        kind,
        kindLabel: KIND_LABELS[kind],
        workDayId: null,
        requestId: req.id,
        userId: req.userId,
        userName,
        workDate,
        requestDateTo: req.requestDateTo ? req.requestDateTo.toISOString().slice(0, 10) : null,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        occurredAt: req.createdAt.toISOString(),
      });
    }

    return items
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, limit);
  }

  /**
   * Ответы руководителя на запросы сотрудника (согласован / отклонён) —
   * персональный фид колокольчика: только запросы самого пользователя.
   */
  async listReviewedRequestsForUser(
    userId: string,
    limit = 20,
  ): Promise<AdminBellWorkDayRequestReviewNotification[]> {
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const requests = await this.prisma.workDayRequest.findMany({
      where: {
        userId,
        status: { in: [WorkDayRequestStatus.APPROVED, WorkDayRequestStatus.REJECTED] },
        reviewedAt: { gte: since },
      },
      orderBy: { reviewedAt: 'desc' },
      take: limit,
    });

    return requests.map((req) => ({
      id: `request_review:${req.id}`,
      requestId: req.id,
      status: req.status === WorkDayRequestStatus.APPROVED ? 'approved' : 'rejected',
      requestType: req.type,
      requestTypeLabel: REQUEST_TYPE_LABELS[req.type],
      workDate: req.requestDate.toISOString().slice(0, 10),
      requestDateTo: req.requestDateTo ? req.requestDateTo.toISOString().slice(0, 10) : null,
      proposedEndTime: req.proposedEndTime,
      reviewComment: req.reviewComment,
      reviewedAt: (req.reviewedAt ?? req.updatedAt).toISOString(),
    }));
  }

  private mapWorkDayItem(
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
      requestId: null,
      userId,
      userName,
      workDate,
      requestDateTo: null,
      lateMinutes: row.lateMinutes,
      earlyLeaveMinutes: row.earlyLeaveMinutes,
      occurredAt: occurredAt.toISOString(),
    };
  }
}
