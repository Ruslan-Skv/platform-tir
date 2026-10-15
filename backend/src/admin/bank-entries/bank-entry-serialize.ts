import { Prisma } from '@prisma/client';

/** Строка раздела «Банк» с автором записи — как её отдаёт список. */
export type BankEntryRowWithUsers = Prisma.BankEntryGetPayload<{
  include: { createdBy: { select: { id: true; email: true; firstName: true; lastName: true } } };
}>;

/** Источник безналичной выплаты з/п в разделе «Банк». */
export type SalaryPayoutBankSource = 'PAYOUT' | 'DP' | 'INSTALLER_ADVANCE';

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
    isPayout: false as boolean,
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

/** Безналичная выплата з/п в форме записи банка: сумма — со знаком минус,
 *  контрагент — получатель. Проекция записей раздела «Выплаты з/п», ручных
 *  записей ДП «Зар/плата» (безнал) и авансов мастерам по банку; в сверке
 *  поступлений и итогах записей банка не участвует. */
export function serializeSalaryPayoutBankEntry(row: {
  id: string;
  source: SalaryPayoutBankSource;
  entryDate: Date;
  amount: Prisma.Decimal;
  counterparty: string;
  notes: string | null;
  createdBy?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const amount = row.amount.neg();
  return {
    id: row.id,
    entryDate: row.entryDate.toISOString().slice(0, 10),
    bank: null,
    entryType: 'SALARY_PAYOUT',
    amount: amount.toString(),
    fee: '0.00',
    refund: '0.00',
    total: amount.toFixed(2),
    counterparty: row.counterparty,
    notes: row.notes,
    isPayout: true as boolean,
    /** Источник строки-проекции (раздел выплат / запись ДП / аванс мастера). */
    payoutSource: row.source,
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
