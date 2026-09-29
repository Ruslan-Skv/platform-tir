import {
  UserRole,
  WorkDayLeaveType,
  WorkDayRequestStatus,
  WorkDayRequestType,
  WorkDayStatus,
  type WorkDay,
  type WorkDayAbsence,
  type WorkDayLeave,
  type WorkDayRequest,
} from '@prisma/client';

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

/** Сотрудник с офисом — источник синтетических строк журнала (выходной / прогул / отпуск). */
export type ScheduleJournalUser = WorkDayJournalUser & {
  officeId: string | null;
  office: { id: string; name: string } | null;
};

/** Согласованный запрос выходного с данными сотрудника — источник строки «Выходной». */
export type ApprovedDayOffRequestRow = WorkDayRequest & {
  user:
    | (WorkDayJournalUser & {
        officeId: string | null;
        office: { id: string; name: string } | null;
      })
    | null;
};

/** Минимум полей отметки отпуска/больничного для синтетической строки журнала. */
export type WorkDayLeaveMarker = Pick<WorkDayLeave, 'id' | 'type' | 'comment'>;

export function toJournalUser(user: ScheduleJournalUser): WorkDayJournalUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}

export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export type WorkDayJournalRow = WorkDay & {
  user: WorkDayJournalUser;
  office: { id: string; name: string } | null;
  absences: WorkDayAbsence[];
  requests: WorkDayRequestBadge[];
  dayOffOnly?: false;
  truancyOnly?: false;
  leaveOnly?: false;
  bySchedule?: false;
};

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
  leaveOnly?: false;
  /** true — обычный выходной по графику (не согласованный запрос). */
  bySchedule?: true;
  office: { id: string; name: string } | null;
  user: WorkDayJournalUser | null;
  absences: [];
  requests: WorkDayRequestBadge[];
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
  leaveOnly?: false;
  bySchedule?: false;
  office: { id: string; name: string } | null;
  user: WorkDayJournalUser | null;
  absences: [];
  requests: WorkDayRequestBadge[];
};

/** Строка журнала за день отпуска или больничного, отмеченных суперадмином (в т.ч. задним числом). */
export type WorkDayLeaveRow = {
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
  leaveOnly: true;
  leaveType: WorkDayLeaveType;
  /** Комментарий отметки (общий на весь период отпуска/больничного). */
  leaveComment: string | null;
  truancyOnly?: false;
  dayOffOnly?: false;
  bySchedule?: false;
  office: { id: string; name: string } | null;
  user: WorkDayJournalUser | null;
  absences: [];
  requests: WorkDayRequestBadge[];
};

export type WorkDayJournalListRow =
  | WorkDayJournalRow
  | WorkDayDayOffRow
  | WorkDayTruancyRow
  | WorkDayLeaveRow;

export function buildLeaveRow(
  user: ScheduleJournalUser,
  date: Date,
  leave: WorkDayLeaveMarker,
): WorkDayLeaveRow {
  return {
    id: `leave-${user.id}-${dateKey(date)}`,
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
    leaveOnly: true,
    leaveType: leave.type,
    leaveComment: leave.comment,
    office: user.office ? { id: user.office.id, name: user.office.name } : null,
    user: toJournalUser(user),
    absences: [],
    requests: [],
  };
}

export function buildTruancyRow(
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

export function buildScheduleDayOffRow(
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

export function buildDayOffRow(
  row: ApprovedDayOffRequestRow,
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
