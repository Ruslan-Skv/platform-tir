import type {
  WorkDayDayOffRow,
  WorkDayExcuseKind,
  WorkDayJournalRow,
  WorkDayLeaveRow,
  WorkDayLeaveType,
  WorkDayRecord,
  WorkDayRequestBadge,
  WorkDayTruancyRow,
} from '@/shared/api/crm/admin-work-days';

export function formatWorkDayTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function formatWorkDayDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU');
}

export function workDayUserName(row: WorkDayJournalRow): string {
  if (!row.user) return '—';
  const name = [row.user.lastName, row.user.firstName].filter(Boolean).join(' ');
  return name || row.user.email;
}

export function isWorkDayDayOffRow(row: WorkDayJournalRow): row is WorkDayDayOffRow {
  return row.dayOffOnly === true;
}

export function isWorkDayTruancyRow(row: WorkDayJournalRow): row is WorkDayTruancyRow {
  return row.truancyOnly === true;
}

export function isWorkDayLeaveRow(row: WorkDayJournalRow): row is WorkDayLeaveRow {
  return row.leaveOnly === true;
}

/** Синтетические строки журнала (выходной / прогул / отпуск / больничный) — без записи в БД. */
export function isWorkDaySyntheticRow(
  row: WorkDayJournalRow
): row is WorkDayDayOffRow | WorkDayTruancyRow | WorkDayLeaveRow {
  return row.dayOffOnly === true || row.truancyOnly === true || row.leaveOnly === true;
}

export function workDayAbsenceMinutes(row: WorkDayJournalRow): number {
  const now = Date.now();
  return (row.absences ?? []).reduce((sum, a) => {
    const end = a.endedAt ? new Date(a.endedAt).getTime() : now;
    return sum + (end - new Date(a.startedAt).getTime()) / 60_000;
  }, 0);
}

export function formatWorkDayAbsenceInterval(startedAt: string, endedAt: string | null): string {
  const start = formatWorkDayTime(startedAt);
  if (!endedAt) return `${start}–…`;
  return `${start}–${formatWorkDayTime(endedAt)}`;
}

export function workDayStatusLabel(status: WorkDayRecord['status']): string {
  if (status === 'AUTO_CLOSED') return 'Авто-закрыт';
  if (status === 'OPEN') return 'Открыт';
  return 'Закрыт';
}

export function workDayRowClassName(
  row: WorkDayJournalRow,
  styles: { readonly [key: string]: string }
): string | undefined {
  if (row.leaveOnly === true) {
    return row.leaveType === 'VACATION' ? styles.rowLeaveVacation : styles.rowLeaveSick;
  }
  if (row.dayOffOnly === true) return styles.rowDayOff;
  // Прощённое нарушение строку не подсвечивает — оно больше не считается нарушением.
  if (row.truancyOnly === true) {
    return hasWorkDayExcuse(row, 'TRUANCY') ? undefined : styles.rowTruancy;
  }
  if (row.isDayOffWork) return styles.rowDayOffWork;
  if (row.status === 'AUTO_CLOSED' && !hasWorkDayExcuse(row, 'AUTO_CLOSE')) {
    return styles.rowAuto;
  }
  if (row.lateMinutes > 0 && !hasWorkDayExcuse(row, 'LATE')) return styles.rowLate;
  if (row.earlyLeaveMinutes > 0 && !hasWorkDayExcuse(row, 'EARLY_LEAVE')) {
    return styles.rowEarly;
  }
  return undefined;
}

export function workDayExcuseLabel(kind: WorkDayExcuseKind): string {
  switch (kind) {
    case 'LATE':
      return 'Опоздание';
    case 'EARLY_LEAVE':
      return 'Ранний уход';
    case 'AUTO_CLOSE':
      return 'Автозакрытие';
    case 'TRUANCY':
      return 'Прогул';
    default:
      return kind;
  }
}

export function hasWorkDayExcuse(row: WorkDayJournalRow, kind: WorkDayExcuseKind): boolean {
  return (row.excuses ?? []).some((excuse) => excuse.kind === kind);
}

/** Нарушение строки журнала, за которое начисляется удержание из оклада. */
export type WorkDayRowViolation = {
  kind: WorkDayExcuseKind;
  /** Минуты — для опоздания и раннего ухода. */
  minutes: number | null;
  excused: boolean;
};

/** Нарушения этой строки журнала (опоздание, ранний уход, автозакрытие, прогул). */
export function workDayRowViolations(row: WorkDayJournalRow): WorkDayRowViolation[] {
  if (row.truancyOnly === true) {
    return [{ kind: 'TRUANCY', minutes: null, excused: hasWorkDayExcuse(row, 'TRUANCY') }];
  }
  const violations: WorkDayRowViolation[] = [];
  if (row.lateMinutes > 0) {
    violations.push({
      kind: 'LATE',
      minutes: row.lateMinutes,
      excused: hasWorkDayExcuse(row, 'LATE'),
    });
  }
  if (row.earlyLeaveMinutes > 0) {
    violations.push({
      kind: 'EARLY_LEAVE',
      minutes: row.earlyLeaveMinutes,
      excused: hasWorkDayExcuse(row, 'EARLY_LEAVE'),
    });
  }
  if (!isWorkDayDayOffRow(row) && !isWorkDayLeaveRow(row) && row.status === 'AUTO_CLOSED') {
    violations.push({
      kind: 'AUTO_CLOSE',
      minutes: null,
      excused: hasWorkDayExcuse(row, 'AUTO_CLOSE'),
    });
  }
  return violations;
}

/** Есть ли на строке нарушение, которое ещё не прощено. */
export function hasUnexcusedWorkDayViolations(row: WorkDayJournalRow): boolean {
  return workDayRowViolations(row).some((violation) => !violation.excused);
}

export function workDayLeaveLabel(type: WorkDayLeaveType): string {
  return type === 'VACATION' ? 'Отпуск' : 'Больничный';
}

const REQUEST_TYPE_SHORT_LABELS: Record<WorkDayRequestBadge['type'], string> = {
  DAY_OFF: 'Выходной',
  EARLY_LEAVE: 'Уйти пораньше',
  LATE_ARRIVAL: 'Прийти попозже',
};

const REQUEST_STATUS_SHORT_LABELS: Record<WorkDayRequestBadge['status'], string> = {
  PENDING: 'ожидает',
  APPROVED: 'согласован',
  REJECTED: 'отклонён',
  CANCELLED: 'отменён',
};

/** «Выходной · согласован», «Уйти пораньше до 17:00 · ожидает» */
export function workDayRequestBadgeLabel(req: WorkDayRequestBadge): string {
  const base = REQUEST_TYPE_SHORT_LABELS[req.type] ?? req.type;
  const timePart = req.proposedEndTime
    ? ` ${req.type === 'LATE_ARRIVAL' ? 'к' : 'до'} ${req.proposedEndTime}`
    : '';
  const statusPart = REQUEST_STATUS_SHORT_LABELS[req.status] ?? req.status;
  return `${base}${timePart} · ${statusPart}`;
}
