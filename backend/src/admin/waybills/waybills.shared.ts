import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  asFormDataRecord,
  customerFromFormData,
} from '../installation-schedules/installation-schedule.shared';

/** Роли, которым разрешено планирование заданий (полный доступ к разделу). */
export const WAYBILL_PLANNER_ROLES = new Set([
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

/** Срок хранения задания в корзине до безвозвратного удаления. */
export const WAYBILL_TRASH_RETENTION_DAYS = 30;
export const WAYBILL_TRASH_RETENTION_MS = WAYBILL_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export function isWaybillPlanner(role: string): boolean {
  return WAYBILL_PLANNER_ROLES.has(role);
}

/** 'YYYY-MM-DD' → Date (UTC, без времени). */
export function parseWaybillDateOnly(dateStr: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) {
    throw new BadRequestException('date must be YYYY-MM-DD');
  }
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

export function waybillTodayDateOnly(): string {
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

export function decimalOrNull(value?: number | null): Prisma.Decimal | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Prisma.Decimal(value);
}

export function composeCustomerInfoText(parts: {
  customerName?: string | null;
  customerAddress?: string | null;
  customerPhones?: string[];
}): string | null {
  const text = [parts.customerName, parts.customerAddress, ...(parts.customerPhones ?? [])]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join('        ');
  return text || null;
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

/**
 * Для задания, связанного с договором-пакетом, номер договора и данные
 * заказчика всегда берутся из пакета — ручные значения клиента используются
 * только для полей, которых в пакете нет (как в графике монтажей).
 */
export async function resolveWaybillPackageSnapshot(
  prisma: PrismaService,
  packageId: string,
): Promise<{
  id: string;
  contractNumber: string | null;
  customerName: string | null;
  customerAddress: string | null;
  customerPhone: string | null;
}> {
  const pkg = await prisma.contractDocumentPackage.findFirst({
    where: { id: packageId, deletedAt: null },
    select: { id: true, formData: true },
  });
  if (!pkg) throw new BadRequestException('Пакет документов не найден');
  const snap = customerFromFormData(asFormDataRecord(pkg.formData));
  return {
    id: pkg.id,
    contractNumber: snap.contractNumber,
    customerName: snap.customerName,
    customerAddress: snap.customerAddress,
    customerPhone: snap.customerPhone,
  };
}
