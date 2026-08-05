import { BadRequestException } from '@nestjs/common';
import { Prisma, FurnitureScheduleEntryKind, FurnitureScheduleProjectStatus } from '@prisma/client';

/** Проекты «В работе» без записи за это число дней считаются «протухшими». */
export const FURNITURE_SCHEDULE_STALE_DAYS = 7;

export const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
} as const;

export const PROJECT_INCLUDE: Prisma.FurnitureScheduleProjectInclude = {
  installer: {
    select: { id: true, fullName: true, direction: true, grade: true, userId: true },
  },
  package: {
    select: {
      id: true,
      kind: true,
      title: true,
      status: true,
      formData: true,
      crmContractId: true,
      crmContract: {
        select: {
          id: true,
          contractNumber: true,
          customerName: true,
          customerAddress: true,
          customerPhone: true,
          totalAmount: true,
          advanceAmount: true,
          actWorkStartDate: true,
          actWorkEndDate: true,
          contractDurationDays: true,
        },
      },
    },
  },
  contract: {
    select: {
      id: true,
      contractNumber: true,
      customerName: true,
      customerAddress: true,
      customerPhone: true,
      actWorkStartDate: true,
      actWorkEndDate: true,
      contractDurationDays: true,
    },
  },
  createdBy: { select: USER_SELECT },
  updatedBy: { select: USER_SELECT },
  entries: {
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: 1,
    include: { createdBy: { select: USER_SELECT } },
  },
};

export const PROJECT_DETAIL_INCLUDE: Prisma.FurnitureScheduleProjectInclude = {
  ...PROJECT_INCLUDE,
  entries: {
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    include: { createdBy: { select: USER_SELECT } },
  },
};

export function emptyToNull(value?: string | null): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function parseDateOnly(dateStr: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) throw new BadRequestException('date must be YYYY-MM-DD');
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

export function asFormDataRecord(formData: unknown): Record<string, unknown> {
  if (!formData || typeof formData !== 'object' || Array.isArray(formData)) return {};
  return formData as Record<string, unknown>;
}

export function customerFromFormData(formData: Record<string, unknown>) {
  const customer = asFormDataRecord(formData.customer);
  const object = asFormDataRecord(formData.object);
  const contract = asFormDataRecord(formData.contract);
  const str = (...values: unknown[]) => {
    for (const v of values) {
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return null;
  };
  const phoneFromPhones = Array.isArray(customer.phones) ? customer.phones[0] : null;
  return {
    customerName: str(
      formData.customerName,
      formData.clientFullName,
      formData.fio,
      customer.fullName,
      customer.customerName,
      customer.fio,
    ),
    customerAddress: str(
      formData.customerAddress,
      formData.objectAddress,
      formData.address,
      object.objectAddress,
      customer.address,
      customer.customerAddress,
    ),
    customerPhone: str(
      formData.customerPhone,
      formData.clientPhone,
      formData.phone,
      customer.phone,
      phoneFromPhones,
      customer.customerPhone,
    ),
    contractNumber: str(formData.contractNumber, formData.dogovorNumber, contract.number),
  };
}

export function decimalOrNull(value?: number | null): Prisma.Decimal | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Prisma.Decimal(value);
}

export function moneyFromUnknown(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    const n = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(n) ? n : null;
  }
  const raw = String(value).replace(/\s/g, '').replace(',', '.');
  const match = raw.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

export function moneyFromFormContract(
  formData: Record<string, unknown>,
  key: string,
): number | null {
  const contract = asFormDataRecord(formData.contract);
  return moneyFromUnknown(contract[key]);
}

export function normalizeContractKey(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, '');
}

export function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function matchInstallerId(
  name: string | null,
  installers: Array<{ id: string; fullName: string }>,
): string | null {
  if (!name) return null;
  const key = normalizeName(name);
  const exact = installers.find((i) => normalizeName(i.fullName) === key);
  if (exact) return exact.id;
  const partial = installers.find(
    (i) => normalizeName(i.fullName).includes(key) || key.includes(normalizeName(i.fullName)),
  );
  return partial?.id ?? null;
}

export type RepairContractAddendumMeta = {
  number: number;
  documentDate: string | null;
  status: 'OPEN' | 'SIGNED' | 'PAID' | string;
  workPeriodChangeDays: number | null;
  signedAt: string | null;
  paidAt: string | null;
};

export type RepairContractTimelineEventType =
  | 'WORK_START_ACT'
  | 'ADDENDUM'
  | 'CALCULATED_END_BASE'
  | 'CALCULATED_END'
  | 'WORK_CLOSE_ACT';

export type RepairContractTimelineEvent = {
  id: string;
  date: string;
  kind: 'CONTRACT';
  eventType: RepairContractTimelineEventType;
  text: string;
};

export type RepairContractMeta = {
  workPeriodDays: number | null;
  workStartActDate: string | null;
  workCloseActDate: string | null;
  calculatedEndDateBase: string | null;
  calculatedEndDate: string | null;
  effectiveWorkPeriodDays: number | null;
  syncedFromPackage: boolean;
  addendums: RepairContractAddendumMeta[];
  contractTimelineEvents: RepairContractTimelineEvent[];
};

function parseIsoDateOnly(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  if (!t) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function dateToIso(value: Date | null | undefined): string | null {
  if (!value) return null;
  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, '0');
  const d = String(value.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseWorkPeriodDays(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const n = Math.trunc(raw);
    return n >= 1 && n <= 3650 ? n : null;
  }
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!/^\d+$/.test(s)) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 1 && n <= 3650 ? n : null;
}

function parseSignedDays(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const n = Math.trunc(raw);
    return n === 0 ? null : n;
  }
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!/^-?\d+$/.test(s)) return null;
  const n = parseInt(s, 10);
  if (!Number.isFinite(n) || n === 0) return null;
  return n;
}

/** Добавляет N рабочих дней (пн–пт); день начала — первый рабочий день отсчёта. */
export function addWorkingDaysExcludingWeekends(
  startIso: string,
  workingDays: number,
): string | null {
  const count = Math.trunc(workingDays);
  if (count < 1) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startIso.trim());
  if (!m) return null;
  const cursor = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  let counted = 0;
  for (let guard = 0; guard < 10_000 && counted < count; guard++) {
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      counted++;
      if (counted === count) return dateToIso(cursor);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return null;
}

function formatRuDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

function addendumStatusLabel(status: string): string {
  if (status === 'SIGNED') return 'подписано';
  if (status === 'PAID') return 'оплачено';
  if (status === 'OPEN') return 'открыто';
  return status;
}

function changeDaysLabel(days: number): string {
  const abs = Math.abs(days);
  const unit = workPeriodUnit(abs);
  if (days > 0) return `увеличение срока на ${days} раб. ${unit}`;
  return `уменьшение срока на ${abs} раб. ${unit}`;
}

function workPeriodUnit(days: number): string {
  const n = Math.abs(days) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return 'дней';
  if (n1 === 1) return 'день';
  if (n1 >= 2 && n1 <= 4) return 'дня';
  return 'дней';
}

export function extractPackageContractTerms(formData: unknown): {
  workPeriodDays: number | null;
  workStartActDate: string | null;
  workCloseActDate: string | null;
  addendums: RepairContractAddendumMeta[];
} {
  const form = asFormDataRecord(formData);
  const contract = asFormDataRecord(form.contract);
  const workPeriodDays = parseWorkPeriodDays(contract.workPeriod);
  const workStartActDate = parseIsoDateOnly(form.repairWorkStartActSignedAt);
  const workCloseActDate = parseIsoDateOnly(form.repairContractCloseActSignedAt);

  const slotCountRaw = form.addendumSlotCount;
  const slotCount =
    typeof slotCountRaw === 'number' && Number.isFinite(slotCountRaw)
      ? Math.max(0, Math.min(5, Math.trunc(slotCountRaw)))
      : 0;
  const slots = Array.isArray(form.addendumSlots) ? form.addendumSlots : [];
  const dates = Array.isArray(form.addendumDocumentDates) ? form.addendumDocumentDates : [];

  const addendums: RepairContractAddendumMeta[] = [];
  for (let i = 0; i < slotCount; i++) {
    const slot = asFormDataRecord(slots[i]);
    const status =
      typeof slot.status === 'string' && slot.status.trim() ? slot.status.trim() : 'OPEN';
    addendums.push({
      number: i + 1,
      documentDate: typeof dates[i] === 'string' && dates[i].trim() ? dates[i].trim() : null,
      status,
      workPeriodChangeDays: parseSignedDays(slot.workPeriodIncreaseDays),
      signedAt: parseIsoDateOnly(slot.signedAt),
      paidAt: parseIsoDateOnly(slot.paidAt),
    });
  }

  return { workPeriodDays, workStartActDate, workCloseActDate, addendums };
}

export function buildRepairContractMeta(input: {
  workPeriodDays: number | null | undefined;
  workStartActDate: Date | string | null | undefined;
  workCloseActDate: Date | string | null | undefined;
  packageFormData?: unknown;
  crmActWorkStartDate?: Date | null;
  crmActWorkEndDate?: Date | null;
  crmContractDurationDays?: number | null;
}): RepairContractMeta {
  const fromPkg = input.packageFormData ? extractPackageContractTerms(input.packageFormData) : null;

  const storedWorkPeriodDays =
    typeof input.workPeriodDays === 'number' ? input.workPeriodDays : null;
  const storedWorkStartActDate =
    typeof input.workStartActDate === 'string'
      ? parseIsoDateOnly(input.workStartActDate)
      : dateToIso(input.workStartActDate);
  const storedWorkCloseActDate =
    typeof input.workCloseActDate === 'string'
      ? parseIsoDateOnly(input.workCloseActDate)
      : dateToIso(input.workCloseActDate);

  /** Сохранённые на проекте поля имеют приоритет — правки в план-графике не затираются пакетом. */
  const workPeriodDays =
    storedWorkPeriodDays ??
    fromPkg?.workPeriodDays ??
    (typeof input.crmContractDurationDays === 'number' ? input.crmContractDurationDays : null);

  const workStartActDate =
    storedWorkStartActDate ??
    fromPkg?.workStartActDate ??
    dateToIso(input.crmActWorkStartDate ?? null);

  const workCloseActDate =
    storedWorkCloseActDate ??
    fromPkg?.workCloseActDate ??
    dateToIso(input.crmActWorkEndDate ?? null);

  const addendums = fromPkg?.addendums ?? [];
  const signedChangeDays = addendums
    .filter((a) => a.status === 'SIGNED' || a.status === 'PAID')
    .reduce((sum, a) => sum + (a.workPeriodChangeDays ?? 0), 0);

  const effectiveWorkPeriodDays =
    workPeriodDays != null ? Math.max(1, workPeriodDays + signedChangeDays) : null;

  const calculatedEndDateBase =
    workStartActDate && workPeriodDays != null
      ? addWorkingDaysExcludingWeekends(workStartActDate, workPeriodDays)
      : null;
  const calculatedEndDate =
    workStartActDate && effectiveWorkPeriodDays != null
      ? addWorkingDaysExcludingWeekends(workStartActDate, effectiveWorkPeriodDays)
      : null;

  const events: RepairContractTimelineEvent[] = [];

  if (workStartActDate) {
    const termHint =
      workPeriodDays != null
        ? ` — от этой даты считается срок договора (${workPeriodDays} раб. ${workPeriodUnit(workPeriodDays)})`
        : '';
    events.push({
      id: 'contract:work-start-act',
      date: workStartActDate,
      kind: 'CONTRACT',
      eventType: 'WORK_START_ACT',
      text: `Акт начала работ подписан${termHint}`,
    });
  }

  for (const addendum of addendums) {
    const eventDate =
      addendum.signedAt ??
      parseIsoDateOnly(addendum.documentDate) ??
      (addendum.documentDate && /^\d{2}\.\d{2}\.\d{4}$/.test(addendum.documentDate)
        ? (() => {
            const [d, m, y] = addendum.documentDate.split('.');
            return `${y}-${m}-${d}`;
          })()
        : null);
    if (!eventDate) continue;
    const change =
      addendum.workPeriodChangeDays != null
        ? `: ${changeDaysLabel(addendum.workPeriodChangeDays)}`
        : '';
    events.push({
      id: `contract:addendum-${addendum.number}`,
      date: eventDate,
      kind: 'CONTRACT',
      eventType: 'ADDENDUM',
      text: `Д/с №${addendum.number} (${addendumStatusLabel(addendum.status)})${change}`,
    });
  }

  if (calculatedEndDateBase && calculatedEndDateBase !== calculatedEndDate) {
    events.push({
      id: 'contract:calculated-end-base',
      date: calculatedEndDateBase,
      kind: 'CONTRACT',
      eventType: 'CALCULATED_END_BASE',
      text: `Расчётный срок окончания (без Д/с): ${formatRuDate(calculatedEndDateBase)}`,
    });
  }

  if (calculatedEndDate) {
    const withDs = signedChangeDays !== 0 ? ' с учётом Д/с' : workPeriodDays != null ? '' : '';
    events.push({
      id: 'contract:calculated-end',
      date: calculatedEndDate,
      kind: 'CONTRACT',
      eventType: 'CALCULATED_END',
      text: `Расчётный срок окончания договора${withDs}: ${formatRuDate(calculatedEndDate)}${
        effectiveWorkPeriodDays != null
          ? ` (${effectiveWorkPeriodDays} раб. ${workPeriodUnit(effectiveWorkPeriodDays)})`
          : ''
      }`,
    });
  }

  if (workCloseActDate) {
    events.push({
      id: 'contract:work-close-act',
      date: workCloseActDate,
      kind: 'CONTRACT',
      eventType: 'WORK_CLOSE_ACT',
      text: `Акт сдачи-приёмки подписан — фактическое окончание (${formatRuDate(workCloseActDate)})`,
    });
  }

  events.sort((a, b) => {
    if (a.date === b.date) return a.id < b.id ? 1 : -1;
    return a.date < b.date ? 1 : -1;
  });

  return {
    workPeriodDays: workPeriodDays ?? null,
    workStartActDate,
    workCloseActDate,
    calculatedEndDateBase,
    calculatedEndDate,
    effectiveWorkPeriodDays,
    syncedFromPackage: Boolean(fromPkg),
    addendums,
    contractTimelineEvents: events,
  };
}

/** Пороги предупреждения о скором окончании срока договора (календарные дни). */
export const REPAIR_DEADLINE_WARN_DAYS = [20, 10, 3] as const;

export type FurnitureDeadlineWarningLevel = 'D20' | 'D10' | 'D3' | 'OVERDUE';

function todayUtcDateOnly(now = new Date()): Date {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/** Сколько календарных дней до даты (отрицательно = уже прошло). */
export function calendarDaysUntilIso(endIso: string, now = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(endIso.trim());
  if (!m) return null;
  const end = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const today = todayUtcDateOnly(now);
  return Math.round((end.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export function buildDeadlineWarning(input: {
  calculatedEndDate: string | null;
  status: FurnitureScheduleProjectStatus;
  workCloseActDate: string | null;
  now?: Date;
}): {
  deadlineDaysLeft: number | null;
  deadlineWarning: FurnitureDeadlineWarningLevel | null;
} {
  if (input.status === FurnitureScheduleProjectStatus.CLOSED || input.workCloseActDate) {
    return { deadlineDaysLeft: null, deadlineWarning: null };
  }
  if (!input.calculatedEndDate) {
    return { deadlineDaysLeft: null, deadlineWarning: null };
  }
  const daysLeft = calendarDaysUntilIso(input.calculatedEndDate, input.now);
  if (daysLeft == null) {
    return { deadlineDaysLeft: null, deadlineWarning: null };
  }
  if (daysLeft < 0) {
    return { deadlineDaysLeft: daysLeft, deadlineWarning: 'OVERDUE' };
  }
  if (daysLeft <= 3) {
    return { deadlineDaysLeft: daysLeft, deadlineWarning: 'D3' };
  }
  if (daysLeft <= 10) {
    return { deadlineDaysLeft: daysLeft, deadlineWarning: 'D10' };
  }
  if (daysLeft <= 20) {
    return { deadlineDaysLeft: daysLeft, deadlineWarning: 'D20' };
  }
  return { deadlineDaysLeft: daysLeft, deadlineWarning: null };
}

export function withDerived<
  T extends {
    status: FurnitureScheduleProjectStatus;
    workPeriodDays?: number | null;
    workStartActDate?: Date | null;
    workCloseActDate?: Date | null;
    package?: {
      formData?: unknown;
      crmContract?: {
        actWorkStartDate?: Date | null;
        actWorkEndDate?: Date | null;
        contractDurationDays?: number | null;
      } | null;
    } | null;
    contract?: {
      actWorkStartDate?: Date | null;
      actWorkEndDate?: Date | null;
      contractDurationDays?: number | null;
    } | null;
    entries: Array<{ date: Date; text: string; kind: FurnitureScheduleEntryKind; id: string }>;
  },
>(project: T) {
  const latestEntry = project.entries[0] ?? null;
  const stale =
    project.status === FurnitureScheduleProjectStatus.IN_PROGRESS &&
    (!latestEntry ||
      Date.now() - latestEntry.date.getTime() >
        FURNITURE_SCHEDULE_STALE_DAYS * 24 * 60 * 60 * 1000);

  const contractMeta = buildRepairContractMeta({
    workPeriodDays: project.workPeriodDays,
    workStartActDate: project.workStartActDate,
    workCloseActDate: project.workCloseActDate,
    packageFormData: project.package?.formData,
    crmActWorkStartDate:
      project.package?.crmContract?.actWorkStartDate ?? project.contract?.actWorkStartDate ?? null,
    crmActWorkEndDate:
      project.package?.crmContract?.actWorkEndDate ?? project.contract?.actWorkEndDate ?? null,
    crmContractDurationDays:
      project.package?.crmContract?.contractDurationDays ??
      project.contract?.contractDurationDays ??
      null,
  });

  const deadline = buildDeadlineWarning({
    calculatedEndDate: contractMeta.calculatedEndDate,
    status: project.status,
    workCloseActDate: contractMeta.workCloseActDate,
  });

  return {
    ...project,
    latestEntry,
    stale,
    staleDays: FURNITURE_SCHEDULE_STALE_DAYS,
    ...contractMeta,
    ...deadline,
    syncedFromPackage: Boolean(project.package),
    /** Эффективные поля для UI: live из пакета или сохранённые на проекте. */
    workPeriodDays: contractMeta.workPeriodDays,
    workStartActDate: contractMeta.workStartActDate,
    workCloseActDate: contractMeta.workCloseActDate,
  };
}
