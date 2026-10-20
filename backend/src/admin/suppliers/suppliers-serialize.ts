import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export const USER_BRIEF_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} as const;

/** Краткое представление заказа в разбивке счёта: formData нужен фронтенду для
 *  подписи «заказчик · № договора» теми же хелперами, что и панель «Поиск заказа». */
export const LEDGER_ORDER_PACKAGE_SELECT = {
  id: true,
  kind: true,
  title: true,
  status: true,
  formData: true,
} as const;

export const LEDGER_ENTRY_INCLUDE = {
  requisite: true,
  createdBy: { select: USER_BRIEF_SELECT },
  orderLinks: {
    include: { package: { select: LEDGER_ORDER_PACKAGE_SELECT } },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.SupplierLedgerEntryInclude;

export type SupplierLedgerEntryRow = Prisma.SupplierLedgerEntryGetPayload<{
  include: typeof LEDGER_ENTRY_INCLUDE;
}>;

/** Округление до копеек без накопления погрешности float. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Date → «ГГГГ-ММ-ДД» (даты ведомости храним как полночь UTC). */
export function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** Дата приходит строкой «ГГГГ-ММ-ДД»; проверяем Round-trip, как в остатках кассы. */
export function parseDateOrThrow(value: string, fieldLabel: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException(`${fieldLabel}: указана несуществующая дата`);
  }
  return date;
}

/** Статус расчётов по знаку сальдо: >0 — должны, <0 — переплата, 0 — расчёты завершены. */
export const SUPPLIER_BALANCE_STATUS = {
  PAYABLE: 'PAYABLE',
  SETTLED: 'SETTLED',
  OVERPAY: 'OVERPAY',
} as const;

export type SupplierBalanceStatus =
  (typeof SUPPLIER_BALANCE_STATUS)[keyof typeof SUPPLIER_BALANCE_STATUS];

/** Порог, ниже которого сальдо считается нулевым (защита от хвостов float). */
export const BALANCE_EPSILON = 0.005;

export function balanceStatus(balance: number): SupplierBalanceStatus {
  if (balance > BALANCE_EPSILON) return SUPPLIER_BALANCE_STATUS.PAYABLE;
  if (balance < -BALANCE_EPSILON) return SUPPLIER_BALANCE_STATUS.OVERPAY;
  return SUPPLIER_BALANCE_STATUS.SETTLED;
}

export function userName(
  user: { email: string; firstName: string | null; lastName: string | null } | null | undefined,
): string | null {
  if (!user) return null;
  return [user.lastName, user.firstName].filter(Boolean).join(' ').trim() || user.email;
}

export function serializeSupplier(supplier: Prisma.SupplierGetPayload<Record<string, never>>) {
  return {
    id: supplier.id,
    legalName: supplier.legalName,
    commercialName: supplier.commercialName,
    inn: supplier.inn,
    email: supplier.email,
    phone: supplier.phone,
    website: supplier.website,
    legalAddress: supplier.legalAddress,
    isActive: supplier.isActive,
    openingBalance:
      supplier.openingBalance != null ? roundMoney(Number(supplier.openingBalance)) : null,
    openingBalanceDate: supplier.openingBalanceDate ? toIsoDate(supplier.openingBalanceDate) : null,
    createdAt: supplier.createdAt.toISOString(),
    updatedAt: supplier.updatedAt.toISOString(),
  };
}

export function serializeRequisite(
  requisite: Prisma.SupplierRequisiteGetPayload<Record<string, never>>,
) {
  return {
    id: requisite.id,
    supplierId: requisite.supplierId,
    name: requisite.name,
    bankName: requisite.bankName,
    bankAccount: requisite.bankAccount,
    bankBik: requisite.bankBik,
    corrAccount: requisite.corrAccount,
    inn: requisite.inn,
    kpp: requisite.kpp,
    note: requisite.note,
    isDefault: requisite.isDefault,
    sortOrder: requisite.sortOrder,
    createdAt: requisite.createdAt.toISOString(),
    updatedAt: requisite.updatedAt.toISOString(),
  };
}

export function serializeLedgerEntry(entry: SupplierLedgerEntryRow) {
  return {
    id: entry.id,
    supplierId: entry.supplierId,
    requisiteId: entry.requisiteId,
    requisiteName: entry.requisite?.name ?? null,
    date: toIsoDate(entry.date),
    documentNo: entry.documentNo,
    amount: entry.amount != null ? roundMoney(Number(entry.amount)) : null,
    payment: entry.payment != null ? roundMoney(Number(entry.payment)) : null,
    paidAmount: roundMoney(Number(entry.paidAmount ?? 0)),
    note: entry.note,
    vatRate: entry.vatRate != null ? Number(entry.vatRate) : null,
    orderLinks: entry.orderLinks.map((link) => ({
      id: link.id,
      packageId: link.packageId,
      amount: roundMoney(Number(link.amount)),
      package: {
        id: link.package.id,
        kind: link.package.kind,
        title: link.package.title,
        status: link.package.status,
        formData: link.package.formData,
      },
    })),
    createdByName: userName(entry.createdBy),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}
