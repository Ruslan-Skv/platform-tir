import { BadRequestException } from '@nestjs/common';
import { INSTALLER_DIRECTIONS } from '../installers/installer-directions.constant';

export const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
} as const;

export const ENTRY_INCLUDE = {
  installer: {
    select: {
      id: true,
      fullName: true,
      direction: true,
      grade: true,
      userId: true,
    },
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
  completedBy: { select: USER_SELECT },
  createdBy: { select: USER_SELECT },
  deletedBy: { select: USER_SELECT },
} as const;

export const INSTALLATION_SCHEDULE_TRASH_RETENTION_DAYS = 30;
export const TRASH_RETENTION_MS = INSTALLATION_SCHEDULE_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export const PLANNER_ROLES = new Set([
  'SUPER_ADMIN',
  'ADMIN',
  'MODERATOR',
  'SUPPORT',
  'MANAGER',
  'TECHNOLOGIST',
  'BRIGADIER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
]);

export const WORK_ORDER_KEYS = [
  'workOrder',
  'workOrderAddendum1',
  'workOrderAddendum2',
  'workOrderAddendum3',
  'workOrderAddendum4',
  'workOrderAddendum5',
  'interactiveFinalEstimate',
  'finalWorkOrder',
] as const;

export const WORK_ORDER_LABELS: Record<(typeof WORK_ORDER_KEYS)[number], string> = {
  workOrder: 'Заказ-наряд',
  workOrderAddendum1: 'ЗН доп. 1',
  workOrderAddendum2: 'ЗН доп. 2',
  workOrderAddendum3: 'ЗН доп. 3',
  workOrderAddendum4: 'ЗН доп. 4',
  workOrderAddendum5: 'ЗН доп. 5',
  interactiveFinalEstimate: 'Интерактивная итоговая смета',
  finalWorkOrder: 'Итоговый заказ-наряд',
};

export function parseDateOnly(dateStr: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) {
    throw new BadRequestException('date must be YYYY-MM-DD');
  }
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

export function todayDateOnly(): string {
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

export function emptyToNull(value?: string | null): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function normalizeCustomerPhones(
  phones?: string[] | null,
  fallbackPhone?: string | null,
): string[] {
  const fromList = (phones ?? []).map((p) => p?.trim()).filter((p): p is string => Boolean(p));
  if (fromList.length > 0) {
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const p of fromList) {
      const key = p.replace(/\D/g, '');
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      unique.push(p);
    }
    return unique;
  }
  const single = fallbackPhone?.trim();
  return single ? [single] : [];
}

export function permanentDeleteAtIso(deletedAt: Date): string {
  return new Date(deletedAt.getTime() + TRASH_RETENTION_MS).toISOString();
}

export function assertDirection(direction: string) {
  if (!(INSTALLER_DIRECTIONS as readonly string[]).includes(direction)) {
    throw new BadRequestException(`Неизвестное направление: ${direction}`);
  }
}

export function asFormDataRecord(formData: unknown): Record<string, unknown> {
  if (!formData || typeof formData !== 'object' || Array.isArray(formData)) return {};
  return formData as Record<string, unknown>;
}

export function addendumSlotCount(formData: Record<string, unknown>): number {
  const raw = formData.addendumSlotCount;
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(0, Math.min(5, raw));
  if (typeof raw === 'string' && raw.trim()) {
    const n = Number(raw);
    if (Number.isFinite(n)) return Math.max(0, Math.min(5, n));
  }
  return 0;
}

export function selectedInstallerIds(formData: Record<string, unknown>): string[] {
  const raw = formData.selectedRepairInstallerIds;
  if (!Array.isArray(raw)) return [];
  return raw.map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean);
}

export function customerFromFormData(formData: Record<string, unknown>): {
  customerName: string | null;
  customerAddress: string | null;
  customerPhone: string | null;
  contractNumber: string | null;
} {
  const str = (key: string) => {
    const v = formData[key];
    return typeof v === 'string' && v.trim() ? v.trim() : null;
  };
  return {
    customerName: str('customerName') ?? str('clientFullName') ?? str('fio'),
    customerAddress: str('customerAddress') ?? str('objectAddress') ?? str('address'),
    customerPhone: str('customerPhone') ?? str('clientPhone') ?? str('phone'),
    contractNumber: str('contractNumber') ?? str('dogovorNumber'),
  };
}

export function isPlanner(role: string): boolean {
  return PLANNER_ROLES.has(role);
}
