import { Injectable } from '@nestjs/common';
import {
  UserRole,
  WorkDayRequestStatus,
  WorkDayRequestType,
  WorkDayStatus,
  type WorkDay,
  type WorkDayAbsence,
  type WorkDayRequest,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

/** Короткая карточка запроса (выходной / пораньше / попозже) для строк журнала. */
export type WorkDayRequestBadge = {
  id: string;
  type: WorkDayRequestType;
  status: WorkDayRequestStatus;
  requestDate: string;
  proposedEndTime: string | null;
  comment: string | null;
  createdAt: Date;
};

export type WorkDayJournalUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
};

/** Строка журнала за согласованную с руководителем дату выходного, когда явки не было. */
export type WorkDayDayOffRow = {
  id: string;
  userId: string;
  officeId: string | null;
  workDate: Date;
  status: WorkDayStatus;
  startedAt: null;
  endedAt: null;
  closeReason: null;
  autoClosedAt: null;
  startedFromIp: null;
  startedFromUserAgent: null;
  endedFromIp: null;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  reportedEndAt: null;
  reopenCount: number;
  dayOffOnly: true;
  office: { id: string; name: string } | null;
  user: WorkDayJournalUser | null;
  absences: [];
  requests: WorkDayRequestBadge[];
};

export type WorkDayJournalRow = WorkDay & {
  user: WorkDayJournalUser;
  office: { id: string; name: string } | null;
  absences: WorkDayAbsence[];
  requests: WorkDayRequestBadge[];
  dayOffOnly?: false;
};

export type WorkDayJournalParams = {
  dateFrom?: string;
  dateTo?: string;
  officeId?: string;
  userId?: string;
};

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toRequestBadge(row: WorkDayRequest): WorkDayRequestBadge {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    requestDate: dateKey(row.requestDate),
    proposedEndTime: row.proposedEndTime,
    comment: row.comment,
    createdAt: row.createdAt,
  };
}

/** Сводка личного журнала сотрудника за период. */
export type WorkDayMySummary = {
  totalDays: number;
  lateDays: number;
  earlyLeaveDays: number;
  autoClosedDays: number;
  totalAbsenceMinutes: number;
  approvedDayOffDays: number;
};

/**
 * Обогащение журнала рабочего времени: прикрепляет к строкам запросы
 * (выходной / уйти пораньше / прийти попозже) и добавляет отдельные строки
 * за согласованные выходные без явки.
 */
@Injectable()
export class WorkDayJournalService {
  constructor(private readonly prisma: PrismaService) {}

  /** Сводка «Моего рабочего дня»: согласованные выходные не считаются рабочими днями. */
  summarizeMyRows(rows: Array<WorkDayJournalRow | WorkDayDayOffRow>): WorkDayMySummary {
    const records = rows.filter((r): r is WorkDayJournalRow => r.dayOffOnly !== true);
    const dayOffDays = rows.filter((r) => r.dayOffOnly === true).length;
    const now = Date.now();
    const totalAbsenceMinutes = records.reduce(
      (sum, row) =>
        sum +
        row.absences.reduce((s, a) => {
          const end = a.endedAt ? a.endedAt.getTime() : now;
          return s + (end - a.startedAt.getTime()) / 60_000;
        }, 0),
      0,
    );
    return {
      totalDays: records.length,
      lateDays: records.filter((r) => r.lateMinutes > 0).length,
      earlyLeaveDays: records.filter((r) => r.earlyLeaveMinutes > 0).length,
      autoClosedDays: records.filter((r) => r.status === WorkDayStatus.AUTO_CLOSED).length,
      totalAbsenceMinutes: Math.round(totalAbsenceMinutes),
      approvedDayOffDays: dayOffDays,
    };
  }

  async attachRequests(
    records: Array<
      WorkDay & {
        user: WorkDayJournalUser;
        office: { id: string; name: string } | null;
        absences: WorkDayAbsence[];
      }
    >,
    params: WorkDayJournalParams,
  ): Promise<Array<WorkDayJournalRow | WorkDayDayOffRow>> {
    const bounds = {
      from: params.dateFrom
        ? new Date(params.dateFrom)
        : records.reduce<Date | null>(
            (min, r) => (!min || r.workDate < min ? r.workDate : min),
            null,
          ),
      to: params.dateTo
        ? new Date(params.dateTo)
        : records.reduce<Date | null>(
            (max, r) => (!max || r.workDate > max ? r.workDate : max),
            null,
          ),
    };
    if (!bounds.from && !params.dateFrom && !params.dateTo && records.length === 0) {
      return records.map((r) => ({ ...r, requests: [] as WorkDayRequestBadge[] }));
    }

    const requestWhere: {
      status: { in: WorkDayRequestStatus[] };
      requestDate?: { gte?: Date; lte?: Date };
      userId?: string;
      user?: { officeId?: string };
    } = {
      status: { in: [WorkDayRequestStatus.APPROVED, WorkDayRequestStatus.PENDING] },
    };
    if (bounds.from || bounds.to) {
      requestWhere.requestDate = {};
      if (bounds.from) requestWhere.requestDate.gte = bounds.from;
      if (bounds.to) requestWhere.requestDate.lte = bounds.to;
    }
    if (params.userId) requestWhere.userId = params.userId;
    if (params.officeId) requestWhere.user = { officeId: params.officeId };

    const requestRows = await this.prisma.workDayRequest.findMany({
      where: requestWhere,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            officeId: true,
            office: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ requestDate: 'desc' }, { createdAt: 'desc' }],
    });

    const requestsByKey = new Map<string, WorkDayRequestBadge[]>();
    for (const row of requestRows) {
      const badge = toRequestBadge(row);
      const key = `${row.userId}|${badge.requestDate}`;
      const list = requestsByKey.get(key) ?? [];
      list.push(badge);
      requestsByKey.set(key, list);
    }

    const enrichedRows: Array<WorkDayJournalRow | WorkDayDayOffRow> = records.map((record) => ({
      ...record,
      requests: requestsByKey.get(`${record.userId}|${dateKey(record.workDate)}`) ?? [],
    }));

    const recordKeys = new Set(
      records.map((record) => `${record.userId}|${dateKey(record.workDate)}`),
    );
    for (const row of requestRows) {
      const badge = toRequestBadge(row);
      if (row.type !== WorkDayRequestType.DAY_OFF) continue;
      if (row.status !== WorkDayRequestStatus.APPROVED) continue;
      const key = `${row.userId}|${badge.requestDate}`;
      if (recordKeys.has(key)) continue;
      recordKeys.add(key);
      enrichedRows.push(this.buildDayOffRow(row, badge));
    }

    return enrichedRows;
  }

  private buildDayOffRow(
    row: WorkDayRequest & {
      user:
        | (WorkDayJournalUser & {
            officeId: string | null;
            office: { id: string; name: string } | null;
          })
        | null;
    },
    badge: WorkDayRequestBadge,
  ): WorkDayDayOffRow {
    return {
      id: row.id,
      userId: row.userId,
      officeId: row.user?.officeId ?? null,
      workDate: row.requestDate,
      status: WorkDayStatus.CLOSED,
      startedAt: null,
      endedAt: null,
      closeReason: null,
      autoClosedAt: null,
      startedFromIp: null,
      startedFromUserAgent: null,
      endedFromIp: null,
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
      reportedEndAt: null,
      reopenCount: 0,
      dayOffOnly: true,
      office: row.user?.office ?? null,
      user: row.user
        ? {
            id: row.user.id,
            email: row.user.email,
            firstName: row.user.firstName,
            lastName: row.user.lastName,
            role: row.user.role,
          }
        : null,
      absences: [],
      requests: [badge],
    };
  }
}
