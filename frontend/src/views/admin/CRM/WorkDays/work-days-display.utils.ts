import type {
  WorkDayDayOffRow,
  WorkDayJournalRow,
  WorkDayRecord,
  WorkDayRequestBadge,
  WorkDayTruancyRow,
} from '@/shared/api/admin-work-days';

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

/** Синтетические строки журнала (согласованный выходной / прогул) — без записи в БД. */
export function isWorkDaySyntheticRow(
  row: WorkDayJournalRow
): row is WorkDayDayOffRow | WorkDayTruancyRow {
  return row.dayOffOnly === true || row.truancyOnly === true;
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
  if (row.dayOffOnly === true) return styles.rowDayOff;
  if (row.truancyOnly === true) return styles.rowTruancy;
  if (row.isDayOffWork) return styles.rowDayOffWork;
  if (row.status === 'AUTO_CLOSED') return styles.rowAuto;
  if (row.lateMinutes > 0) return styles.rowLate;
  if (row.earlyLeaveMinutes > 0) return styles.rowEarly;
  return undefined;
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
