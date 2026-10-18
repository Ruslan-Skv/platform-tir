import { ContractDocumentPackageKind } from '@prisma/client';

/** Статусы договоров план-графика ОДПЖ (паритет с frontend). */
export type OdpzhScheduleStatus = 'NEW' | 'IN_PROGRESS' | 'INSTALLATIONS_DONE' | 'CLOSED';

export const ODPZH_SCHEDULE_STATUSES: readonly OdpzhScheduleStatus[] = [
  'NEW',
  'IN_PROGRESS',
  'INSTALLATIONS_DONE',
  'CLOSED',
];

/** Направления план-графика ОДПЖ (без мебели — у неё свой раздел). */
export const ODPZH_SCHEDULE_KINDS = [
  ContractDocumentPackageKind.WINDOWS,
  ContractDocumentPackageKind.DOORS,
  ContractDocumentPackageKind.CEILINGS,
  ContractDocumentPackageKind.BLINDS,
] as const;

export type OdpzhScheduleKind = (typeof ODPZH_SCHEDULE_KINDS)[number];

export function isOdpzhScheduleStatus(value: string): value is OdpzhScheduleStatus {
  return (ODPZH_SCHEDULE_STATUSES as readonly string[]).includes(value);
}

/** Уровень предупреждения по сроку договора (паритет с ремонтным план-графиком). */
export type OdpzhDeadlineWarningLevel = 'D20' | 'D10' | 'D3' | 'OVERDUE';

/** Сколько календарных дней до даты (отрицательно = уже прошло). */
export function odpzhCalendarDaysUntilIso(endIso: string, now = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(endIso.trim());
  if (!m) return null;
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const end = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Math.round((end.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export function buildOdpzhDeadlineWarning(input: {
  contractEndDate: string | null;
  status: OdpzhScheduleStatus;
  now?: Date;
}): {
  deadlineDaysLeft: number | null;
  deadlineWarning: OdpzhDeadlineWarningLevel | null;
} {
  if (input.status === 'CLOSED' || !input.contractEndDate) {
    return { deadlineDaysLeft: null, deadlineWarning: null };
  }
  const daysLeft = odpzhCalendarDaysUntilIso(input.contractEndDate, input.now);
  if (daysLeft == null) return { deadlineDaysLeft: null, deadlineWarning: null };
  if (daysLeft < 0) return { deadlineDaysLeft: daysLeft, deadlineWarning: 'OVERDUE' };
  if (daysLeft <= 3) return { deadlineDaysLeft: daysLeft, deadlineWarning: 'D3' };
  if (daysLeft <= 10) return { deadlineDaysLeft: daysLeft, deadlineWarning: 'D10' };
  if (daysLeft <= 20) return { deadlineDaysLeft: daysLeft, deadlineWarning: 'D20' };
  return { deadlineDaysLeft: daysLeft, deadlineWarning: null };
}
