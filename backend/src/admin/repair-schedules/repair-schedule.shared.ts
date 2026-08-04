import { BadRequestException } from '@nestjs/common';
import { Prisma, RepairScheduleEntryKind, RepairScheduleProjectStatus } from '@prisma/client';

/** Проекты «В работе» без записи за это число дней считаются «протухшими». */
export const REPAIR_SCHEDULE_STALE_DAYS = 7;

export const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
} as const;

export const PROJECT_INCLUDE: Prisma.RepairScheduleProjectInclude = {
  installer: {
    select: { id: true, fullName: true, direction: true, grade: true, userId: true },
  },
  package: {
    select: {
      id: true,
      kind: true,
      title: true,
      status: true,
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

export const PROJECT_DETAIL_INCLUDE: Prisma.RepairScheduleProjectInclude = {
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

export function withDerived<
  T extends {
    status: RepairScheduleProjectStatus;
    entries: Array<{ date: Date; text: string; kind: RepairScheduleEntryKind; id: string }>;
  },
>(project: T) {
  const latestEntry = project.entries[0] ?? null;
  const stale =
    project.status === RepairScheduleProjectStatus.IN_PROGRESS &&
    (!latestEntry ||
      Date.now() - latestEntry.date.getTime() > REPAIR_SCHEDULE_STALE_DAYS * 24 * 60 * 60 * 1000);
  return {
    ...project,
    latestEntry,
    stale,
    staleDays: REPAIR_SCHEDULE_STALE_DAYS,
  };
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
