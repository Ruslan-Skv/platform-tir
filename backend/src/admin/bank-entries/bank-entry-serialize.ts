import { Prisma } from '@prisma/client';

const USER_SELECT = { id: true, email: true, firstName: true, lastName: true } as const;

/** Строка раздела «Банк» с автором записи — как её отдаёт список. */
export type BankEntryRowWithUsers = Prisma.BankEntryGetPayload<{
  include: { createdBy: { select: typeof USER_SELECT } };
}>;

/** Форма записи банка для клиента: суммы строками (Decimal), даты — ISO. */
export function serializeBankEntry(row: BankEntryRowWithUsers) {
  const amount = row.amount.toNumber();
  const fee = row.fee.toNumber();
  const refund = row.refund.toNumber();
  return {
    id: row.id,
    entryDate: row.entryDate.toISOString().slice(0, 10),
    bank: row.bank,
    entryType: row.entryType,
    amount: row.amount.toString(),
    fee: row.fee.toString(),
    refund: row.refund.toString(),
    /** Валовая сумма операции: зачисление + комиссия + возврат (итого в таблице учёта). */
    total: (amount + fee + refund).toFixed(2),
    counterparty: row.counterparty,
    notes: row.notes,
    createdBy: row.createdBy
      ? {
          id: row.createdBy.id,
          name:
            [row.createdBy.lastName, row.createdBy.firstName].filter(Boolean).join(' ').trim() ||
            row.createdBy.email,
        }
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
