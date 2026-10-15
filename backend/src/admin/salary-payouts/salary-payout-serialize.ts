import { Prisma } from '@prisma/client';

type UserSelect = { select: { id: true; email: true; firstName: true; lastName: true } };

/** Выплата раздела с получателем, кассой и автором — как её отдаёт журнал. */
export type SalaryPayoutRowWithUsers = Prisma.SalaryPayoutGetPayload<{
  include: {
    recipientUser: UserSelect;
    manager: UserSelect;
    createdBy: UserSelect;
  };
}>;

/** Ручная запись ДП с основанием «Зар/плата» — второй источник журнала выплат. */
export type SalaryDpMovementRow = Prisma.MoneyMovementGetPayload<{
  include: {
    manager: UserSelect;
    createdBy: UserSelect;
  };
}>;

export function serializeUserName(user: {
  email: string;
  firstName: string | null;
  lastName: string | null;
}) {
  return [user.lastName, user.firstName].filter(Boolean).join(' ').trim() || user.email;
}

export type SerializedSalaryPayout = {
  id: string;
  /** Источник: PAYOUT — запись раздела «Выплаты з/п», DP — ручная запись журнала ДП. */
  source: 'PAYOUT' | 'DP';
  paidAt: string;
  performedAt: string;
  amount: string;
  method: 'CASH' | 'BANK';
  category: 'SALARY' | 'ADVANCE' | 'BONUS' | 'OTHER';
  recipientName: string;
  note: string | null;
  manager: { id: string; name: string } | null;
  createdBy: { id: string; name: string } | null;
  /** Ручная сверка ДП (золотая печать): наличная запись попадает в кассу только после неё. */
  manualReconciledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Запись раздела «Выплаты з/п» в форме строки журнала. */
export function serializeSalaryPayout(row: SalaryPayoutRowWithUsers): SerializedSalaryPayout {
  return {
    id: row.id,
    source: 'PAYOUT',
    paidAt: row.paidAt.toISOString().slice(0, 10),
    performedAt: row.createdAt.toISOString(),
    amount: row.amount.toString(),
    method: row.paymentMethod,
    category: row.category,
    recipientName: row.recipientName,
    note: row.note,
    manager: row.manager ? { id: row.manager.id, name: serializeUserName(row.manager) } : null,
    createdBy: row.createdBy
      ? { id: row.createdBy.id, name: serializeUserName(row.createdBy) }
      : null,
    manualReconciledAt: null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Ручная запись ДП «Зар/плата» в форме строки журнала (сумма записи отрицательна —
 *  в журнале выплат показываем положительную сумму выплаты). */
export function serializeSalaryDpMovement(row: SalaryDpMovementRow): SerializedSalaryPayout {
  return {
    id: row.id,
    source: 'DP',
    paidAt: row.paymentDate.toISOString().slice(0, 10),
    performedAt: row.performedAt.toISOString(),
    amount: row.amount.neg().abs().toString(),
    method: row.paymentForm === 'CASH' ? 'CASH' : 'BANK',
    category: 'SALARY',
    recipientName: row.salaryRecipientName ?? '—',
    note: row.notes,
    manager: row.manager ? { id: row.manager.id, name: serializeUserName(row.manager) } : null,
    createdBy: row.createdBy
      ? { id: row.createdBy.id, name: serializeUserName(row.createdBy) }
      : null,
    manualReconciledAt: row.manualReconciledAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Порядок журнала выплат: дата по убыванию, затем время и id — для стабильного
 *  слияния источников (записи раздела и ручные записи ДП). */
export function compareSalaryPayoutsDesc(a: SerializedSalaryPayout, b: SerializedSalaryPayout) {
  if (a.paidAt !== b.paidAt) return a.paidAt < b.paidAt ? 1 : -1;
  if (a.performedAt !== b.performedAt) return a.performedAt < b.performedAt ? 1 : -1;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}
