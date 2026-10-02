import type { BankCode, BankEntryType } from '@/shared/api/admin-bank-entries';

/** Банки расчётных счётов — как в таблице учёта поступлений. */
export const BANK_LABELS: Record<BankCode, string> = {
  SBER: 'Сбер',
  ALFA: 'Альфа',
  OTHER: 'Другой',
};

/** Способы оплаты в разделе «Банк» — соответствуют способам оплаты журнала ДП.
 * «Терминал + QR» объединяет эквайринг, СБП и QR-оплаты: из банковской выписки
 * не всегда видно, как именно платил клиент. */
export const BANK_ENTRY_TYPE_LABELS: Record<BankEntryType, string> = {
  TERMINAL_QR: 'Терминал + QR',
  INVOICE_PAYMENT: 'По счёту',
  LC_TRANSFER: 'Перевод на ЛК',
};

export const BANK_OPTIONS = (Object.keys(BANK_LABELS) as BankCode[]).map((value) => ({
  value,
  label: BANK_LABELS[value],
}));

export const BANK_ENTRY_TYPE_OPTIONS = (Object.keys(BANK_ENTRY_TYPE_LABELS) as BankEntryType[]).map(
  (value) => ({ value, label: BANK_ENTRY_TYPE_LABELS[value] })
);

/** Первый день текущего месяца (YYYY-MM-DD) — период по умолчанию. */
export function currentMonthStartIso(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-01`;
}

/** Сегодня (YYYY-MM-DD) в локальной таймзоне. */
export function todayIso(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
}

/** Склонение числа: 1 поступление, 2 поступления, 5 поступлений. */
export function pluralEntries(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'поступление';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'поступления';
  return 'поступлений';
}
