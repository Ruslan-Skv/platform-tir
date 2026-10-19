import type { SupplierBalanceStatus } from '@/shared/api/admin-suppliers';

/** Сумма в рублях с копейками — сальдо поставщиков важны до копейки. */
export function formatSupplierMoney(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Дата «ГГГГ-ММ-ДД» → «ДД.ММ.ГГГГ». */
export function formatSupplierDate(value: string | null | undefined): string {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-');
  if (!y || !m || !d) return value;
  return `${d}.${m}.${y}`;
}

/** Подпись статуса расчётов по знаку сальдо. */
export const BALANCE_STATUS_LABELS: Record<SupplierBalanceStatus, string> = {
  PAYABLE: 'К оплате',
  SETTLED: 'Расчёты завершены',
  OVERPAY: 'Переплата',
};

export type LedgerRowStatus = 'PAID' | 'PARTIAL' | 'UNPAID' | 'PAYMENT_ONLY';

export const LEDGER_ROW_STATUS_LABELS: Record<LedgerRowStatus, string> = {
  PAID: 'Оплачен',
  PARTIAL: 'Частично',
  UNPAID: 'Не оплачен',
  PAYMENT_ONLY: 'Оплата',
};

/** Статус строки ведомости: сравнение счёта и оплаты (как «ОПЛАЧЕН» в таблице,
 *  только вычисляется автоматически). */
export function getLedgerRowStatus(entry: {
  amount: number | null;
  payment: number | null;
}): LedgerRowStatus | null {
  const amount = entry.amount ?? 0;
  const payment = entry.payment ?? 0;
  if (amount > 0) {
    if (payment >= amount) return 'PAID';
    if (payment > 0) return 'PARTIAL';
    return 'UNPAID';
  }
  if (payment !== 0) return 'PAYMENT_ONLY';
  return null;
}

/** НДС записи в человекочитаемом виде: null — «—», 0 — «Без НДС». */
export function formatVatRate(value: number | null): string {
  if (value == null) return '—';
  if (value === 0) return 'Без НДС';
  return `НДС ${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)}%`;
}

/** Парсинг числа из поля ввода («83061,40» / «83 061.40»). */
export function parseMoneyInput(value: string): number | null {
  const trimmed = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}
