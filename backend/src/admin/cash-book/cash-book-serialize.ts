import { ContractDocumentPackageKind, Prisma } from '@prisma/client';

import { SALARY_PAYOUT_BASIS } from '../../common/constants/salary-payout';
import { PACKAGE_DIRECTION_REGISTRY } from '../../common/config/package-direction-registry.config';

export const MANAGER_SELECT = { id: true, email: true, firstName: true, lastName: true } as const;

/** Тип записи кассы: MANUAL — ручная проводка, OPENING — начальный остаток. */
export const CASH_ENTRY_KIND_MANUAL = 'MANUAL';
export const CASH_ENTRY_KIND_OPENING = 'OPENING';

/** Основание спец-записи начального остатка кассы. */
export const OPENING_BALANCE_BASIS = 'Начальный остаток';

const KIND_TO_DIRECTION_NAME = Object.fromEntries(
  PACKAGE_DIRECTION_REGISTRY.map((d) => [d.kind, d.name]),
) as Record<ContractDocumentPackageKind, string>;

/** Экранирование спецсимволов ILIKE (% _ \) в поисковом запросе. */
export function escapeLike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export const ENTRY_INCLUDE = {
  manager: { select: MANAGER_SELECT },
} satisfies Prisma.CashBookEntryInclude;

export const MOVEMENT_INCLUDE = {
  manager: { select: MANAGER_SELECT },
} satisfies Prisma.MoneyMovementInclude;

export const PAYOUT_INCLUDE = {
  manager: { select: MANAGER_SELECT },
  createdBy: { select: MANAGER_SELECT },
} satisfies Prisma.SalaryPayoutInclude;

export type CashBookRowWithManager = Prisma.CashBookEntryGetPayload<{
  include: typeof ENTRY_INCLUDE;
}>;
export type MovementRowWithManager = Prisma.MoneyMovementGetPayload<{
  include: typeof MOVEMENT_INCLUDE;
}>;
export type PayoutRowWithUsers = Prisma.SalaryPayoutGetPayload<{
  include: typeof PAYOUT_INCLUDE;
}>;

/** Строка журнала выплат мастерам (сырой SQL): реквизиты договора достаём из formData пакета. */
export type SalaryAdvanceRawRow = {
  id: string;
  installerLiveName: string | null;
  installerName: string | null;
  paidAt: Date;
  amount: Prisma.Decimal | number;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  createdByFirstName: string | null;
  createdByLastName: string | null;
  createdByEmail: string | null;
  packageKind: ContractDocumentPackageKind;
  contractNumber: string | null;
  customerName: string | null;
};

/** Общий вид записи кассы на клиенте: записи кассы и наличные ДП сериализуются одинаково. */
export type SerializedCashEntry = ReturnType<typeof serializeCashBookEntry>;

export function managerName(user: {
  email: string;
  firstName: string | null;
  lastName: string | null;
}) {
  return [user.lastName, user.firstName].filter(Boolean).join(' ').trim() || user.email;
}

/** Поиск по текстовым полям — поля совпадают у записей кассы и движений ДП. */
export function cashSearchFilter(search: string) {
  return {
    OR: [
      { contractNumber: { contains: search, mode: 'insensitive' as const } },
      { customerName: { contains: search, mode: 'insensitive' as const } },
      { basis: { contains: search, mode: 'insensitive' as const } },
      { notes: { contains: search, mode: 'insensitive' as const } },
    ],
  };
}

/** Поиск по полям движений ДП — как в кассе, плюс получатель зар/платы записи «Зар/плата». */
export function movementSearchFilter(search: string): Prisma.MoneyMovementWhereInput {
  return {
    OR: [
      { contractNumber: { contains: search, mode: 'insensitive' } },
      { customerName: { contains: search, mode: 'insensitive' } },
      { basis: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
      { salaryRecipientName: { contains: search, mode: 'insensitive' } },
    ],
  };
}

/** Форма записи кассы для клиента (задаёт тип SerializedCashEntry). */
export function serializeCashBookEntry(row: CashBookRowWithManager) {
  return {
    id: row.id,
    paymentDate: row.paymentDate.toISOString().slice(0, 10),
    performedAt: row.performedAt.toISOString(),
    amount: row.amount.toString(),
    manager: row.manager
      ? {
          id: row.manager.id,
          name: managerName(row.manager),
        }
      : null,
    direction: row.direction,
    contractNumber: row.contractNumber,
    customerName: row.customerName,
    executorName: row.executorName,
    basis: row.basis,
    notes: row.notes,
    kind: row.kind,
    salaryRecipientName: null as string | null,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Начальный остаток кассы для клиента: якорь, от которого считаются остатки. */
export function serializeOpeningBalance(row: CashBookRowWithManager) {
  return {
    id: row.id,
    date: row.paymentDate.toISOString().slice(0, 10),
    amount: Number(row.amount),
    notes: row.notes,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Наличная оплата ДП в форме записи кассы — те же поля, что у записи кассы. */
export function serializeMovementAsCashEntry(row: MovementRowWithManager): SerializedCashEntry {
  return {
    id: row.id,
    paymentDate: row.paymentDate.toISOString().slice(0, 10),
    performedAt: row.performedAt.toISOString(),
    amount: row.amount.toString(),
    manager: row.manager
      ? {
          id: row.manager.id,
          name: managerName(row.manager),
        }
      : null,
    direction: row.direction,
    contractNumber: row.contractNumber,
    customerName: row.customerName,
    executorName: row.executorName,
    basis: row.basis,
    notes: row.notes,
    kind: CASH_ENTRY_KIND_MANUAL,
    /** Получатель зар/платы свёрнутой записи ДП с основанием «Зар/плата». */
    salaryRecipientName: row.salaryRecipientName ?? null,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Выплата мастеру наличными в форме записи кассы: сумма — со знаком минус
 *  (изъятие из кассы), основание — «Зар/плата», в колонке зар/платы — ФИО мастера. */
export function serializeSalaryAdvanceAsCashEntry(row: SalaryAdvanceRawRow): SerializedCashEntry {
  const createdBy = [row.createdByLastName, row.createdByFirstName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const managerNameValue = createdBy || row.createdByEmail || null;
  return {
    id: row.id,
    paymentDate: row.paidAt.toISOString().slice(0, 10),
    performedAt: row.createdAt.toISOString(),
    amount: new Prisma.Decimal(row.amount).neg().toString(),
    manager:
      row.createdById && managerNameValue ? { id: row.createdById, name: managerNameValue } : null,
    direction: KIND_TO_DIRECTION_NAME[row.packageKind] ?? String(row.packageKind),
    contractNumber: row.contractNumber,
    customerName: row.customerName,
    executorName: null,
    basis: SALARY_PAYOUT_BASIS,
    notes: row.note,
    kind: CASH_ENTRY_KIND_MANUAL,
    salaryRecipientName: row.installerLiveName ?? row.installerName,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Выплата з/п из раздела «Выплаты з/п» в форме записи кассы: сумма — со знаком
 *  минус (изъятие наличных), основание — «Зар/плата», в колонке зар/платы — ФИО
 *  получателя. Менеджер кассы — кто выдал (менеджер или автор записи выплаты). */
export function serializeSalaryPayoutAsCashEntry(row: PayoutRowWithUsers): SerializedCashEntry {
  const manager = row.manager ?? row.createdBy;
  return {
    id: row.id,
    paymentDate: row.paidAt.toISOString().slice(0, 10),
    performedAt: row.createdAt.toISOString(),
    amount: row.amount.neg().toString(),
    manager: manager ? { id: manager.id, name: managerName(manager) } : null,
    direction: null,
    contractNumber: null,
    customerName: null,
    executorName: null,
    basis: SALARY_PAYOUT_BASIS,
    notes: row.note,
    kind: CASH_ENTRY_KIND_MANUAL,
    salaryRecipientName: row.recipientName,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Порядок журнала кассы: дата по убыванию, затем время и id — для стабильного
 *  слияния источников (записи кассы, наличные ДП и выплаты мастерам). */
export function compareCashEntriesDesc(a: SerializedCashEntry, b: SerializedCashEntry): number {
  if (a.paymentDate !== b.paymentDate) return a.paymentDate < b.paymentDate ? 1 : -1;
  if (a.performedAt !== b.performedAt) return a.performedAt < b.performedAt ? 1 : -1;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}
