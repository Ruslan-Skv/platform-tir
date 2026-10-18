import { ContractDocumentPackageKind } from '@prisma/client';

/** Статусы договоров план-графика ОДПЖ (паритет с frontend). */
export type OdpzhScheduleStatus = 'NEW' | 'IN_PROGRESS' | 'CLOSED';

export const ODPZH_SCHEDULE_STATUSES: readonly OdpzhScheduleStatus[] = [
  'NEW',
  'IN_PROGRESS',
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
