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
import { DEFAULT_WORK_DAY_SETTINGS } from '../work-day.constants';
import {
  WORK_DAY_TIMEZONE,
  getDayOfWeekInTimezone,
  getTodayDateInTimezone,
  resolveDaySchedule,
} from '../utils/work-day.utils';

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

/** Сотрудник с офисом — источник синтетических строк журнала (выходной / прогул). */
type ScheduleJournalUser = WorkDayJournalUser & {
  officeId: string | null;
  office: { id: string; name: string } | null;
};

function toJournalUser(user: ScheduleJournalUser): WorkDayJournalUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}

/**
 * Строка журнала за выходной: согласованный с руководителем (по запросу)
 * либо обычный выходной по графику сотрудника, когда явки не было.
 */
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
  isDayOffWork: false;
  dayOffOnly: true;
  truancyOnly?: false;
  /** true — обычный выходной по графику (не согласованный запрос). */
  bySchedule?: true;
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
  truancyOnly?: false;
  bySchedule?: false;
};

/** Строка журнала за прошедший рабочий день по графику без явки и без согласованного выходного. */
export type WorkDayTruancyRow = {
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
  isDayOffWork: false;
  truancyOnly: true;
  dayOffOnly?: false;
  bySchedule?: false;
  office: { id: string; name: string } | null;
  user: WorkDayJournalUser | null;
  absences: [];
  requests: WorkDayRequestBadge[];
};

export type WorkDayJournalListRow = WorkDayJournalRow | WorkDayDayOffRow | WorkDayTruancyRow;

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
  /** Выходные по графику без явки (субботы/воскресенья и т.п.). */
  scheduleDayOffDays: number;
  /** Прогулы: рабочие дни по графику без явки и без согласованного выходного. */
  truancyDays: number;
  /** Выходы на работу в свой выходной по графику. */
  dayOffWorkDays: number;
};

/**
 * Обогащение журнала рабочего времени: прикрепляет к строкам запросы
 * (выходной / уйти пораньше / прийти попозже) и добавляет отдельные строки
 * за выходные дни без явки — как согласованные, так и обычные по графику.
 */
@Injectable()
export class WorkDayJournalService {
  constructor(private readonly prisma: PrismaService) {}

  /** Сводка «Моего рабочего дня»: выходные и прогулы не считаются рабочими днями. */
  summarizeMyRows(rows: WorkDayJournalListRow[]): WorkDayMySummary {
    const records = rows.filter(
      (r): r is WorkDayJournalRow => r.dayOffOnly !== true && r.truancyOnly !== true,
    );
    const approvedDayOffDays = rows.filter(
      (r) => r.dayOffOnly === true && r.bySchedule !== true,
    ).length;
    const scheduleDayOffDays = rows.filter(
      (r) => r.dayOffOnly === true && r.bySchedule === true,
    ).length;
    const truancyDays = rows.filter((r) => r.truancyOnly === true).length;
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
      approvedDayOffDays,
      scheduleDayOffDays,
      truancyDays,
      dayOffWorkDays: records.filter((r) => r.isDayOffWork).length,
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
  ): Promise<WorkDayJournalListRow[]> {
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

    const enrichedRows: WorkDayJournalListRow[] = records.map((record) => ({
      ...record,
      requests: requestsByKey.get(`${record.userId}|${dateKey(record.workDate)}`) ?? [],
    }));

    const recordKeys = new Set(
      records.map((record) => `${record.userId}|${dateKey(record.workDate)}`),
    );
    const approvedDayOffKeys = new Set<string>();
    for (const [key, badges] of requestsByKey) {
      if (
        badges.some(
          (b) =>
            b.type === WorkDayRequestType.DAY_OFF && b.status === WorkDayRequestStatus.APPROVED,
        )
      ) {
        approvedDayOffKeys.add(key);
      }
    }
    for (const row of requestRows) {
      const badge = toRequestBadge(row);
      if (row.type !== WorkDayRequestType.DAY_OFF) continue;
      if (row.status !== WorkDayRequestStatus.APPROVED) continue;
      const key = `${row.userId}|${badge.requestDate}`;
      if (recordKeys.has(key)) continue;
      recordKeys.add(key);
      enrichedRows.push(this.buildDayOffRow(row, badge));
    }

    await this.appendScheduleDayRows(enrichedRows, {
      params,
      recordKeys,
      approvedDayOffKeys,
      requestsByKey,
    });

    return enrichedRows;
  }

  /**
   * Дни без явки по графику сотрудника (общему или индивидуальному):
   * прошедшие рабочие дни без записи и без согласованного выходного — «прогул»,
   * остальные нерабочие дни по графику — строки «выходной».
   */
  private async appendScheduleDayRows(
    rows: WorkDayJournalListRow[],
    ctx: {
      params: WorkDayJournalParams;
      recordKeys: Set<string>;
      approvedDayOffKeys: Set<string>;
      requestsByKey: Map<string, WorkDayRequestBadge[]>;
    },
  ): Promise<void> {
    const settingsRow = await this.prisma.workDaySettings.findUnique({ where: { id: 'main' } });
    const settings = settingsRow ?? DEFAULT_WORK_DAY_SETTINGS;
    if (!settings.isEnabled) return;

    const today = getTodayDateInTimezone();
    // Прогул фиксируем только по полностью прошедшим дням (сегодня ещё не закончился);
    // выходные по графику показываем и на сегодня, и на будущие даты периода.
    const lastMissedDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const requestedFrom = ctx.params.dateFrom ? new Date(ctx.params.dateFrom) : null;
    const requestedTo = ctx.params.dateTo ? new Date(ctx.params.dateTo) : null;
    const recordsFrom = rows.reduce<Date | null>(
      (min, r) => (!min || r.workDate < min ? r.workDate : min),
      null,
    );
    const from =
      requestedFrom ?? recordsFrom ?? new Date(lastMissedDate.getTime() - 29 * 24 * 60 * 60 * 1000);
    const to = requestedTo ?? today;
    if (from > to) return;

    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        workDayTrackingEnabled: true,
        role: { in: settings.trackedRoles.filter((r) => r !== UserRole.SUPER_ADMIN) },
        ...(ctx.params.userId ? { id: ctx.params.userId } : {}),
        ...(ctx.params.officeId ? { officeId: ctx.params.officeId } : {}),
      },
      include: { office: true },
    });

    for (const user of users) {
      for (let date = new Date(from); date <= to; date = new Date(date.getTime() + 86_400_000)) {
        const key = `${user.id}|${dateKey(date)}`;
        if (ctx.recordKeys.has(key) || ctx.approvedDayOffKeys.has(key)) continue;
        const schedule = resolveDaySchedule(
          user,
          user.office,
          settings,
          getDayOfWeekInTimezone(WORK_DAY_TIMEZONE, date),
        );
        if (schedule.isWorkDay) {
          if (date > lastMissedDate) continue;
          rows.push(this.buildTruancyRow(user, date, ctx.requestsByKey.get(key) ?? []));
        } else {
          rows.push(this.buildScheduleDayOffRow(user, date, ctx.requestsByKey.get(key) ?? []));
        }
      }
    }
  }

  private buildTruancyRow(
    user: ScheduleJournalUser,
    date: Date,
    requests: WorkDayRequestBadge[],
  ): WorkDayTruancyRow {
    return {
      id: `truancy-${user.id}-${dateKey(date)}`,
      userId: user.id,
      officeId: user.officeId,
      workDate: new Date(date),
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
      isDayOffWork: false,
      truancyOnly: true,
      office: user.office ? { id: user.office.id, name: user.office.name } : null,
      user: toJournalUser(user),
      absences: [],
      requests,
    };
  }

  private buildScheduleDayOffRow(
    user: ScheduleJournalUser,
    date: Date,
    requests: WorkDayRequestBadge[],
  ): WorkDayDayOffRow {
    return {
      id: `dayoff-${user.id}-${dateKey(date)}`,
      userId: user.id,
      officeId: user.officeId,
      workDate: new Date(date),
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
      isDayOffWork: false,
      dayOffOnly: true,
      bySchedule: true,
      office: user.office ? { id: user.office.id, name: user.office.name } : null,
      user: toJournalUser(user),
      absences: [],
      requests,
    };
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
      isDayOffWork: false,
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
