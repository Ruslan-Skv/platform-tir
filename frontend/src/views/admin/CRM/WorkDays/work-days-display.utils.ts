import type { WorkDayRecord } from '@/shared/api/admin-work-days';

export function formatWorkDayTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function formatWorkDayDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU');
}

export function workDayUserName(row: WorkDayRecord): string {
  if (!row.user) return '—';
  const name = [row.user.lastName, row.user.firstName].filter(Boolean).join(' ');
  return name || row.user.email;
}

export function workDayAbsenceMinutes(row: WorkDayRecord): number {
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
  row: WorkDayRecord,
  styles: { readonly [key: string]: string }
): string | undefined {
  if (row.status === 'AUTO_CLOSED') return styles.rowAuto;
  if (row.lateMinutes > 0) return styles.rowLate;
  return undefined;
}
