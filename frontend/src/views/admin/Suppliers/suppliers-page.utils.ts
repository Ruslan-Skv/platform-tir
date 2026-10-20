import type { ContractDocumentPackage } from '@/shared/api/admin-contract-document-packages';
import type {
  AdminSupplierLedgerOrderLink,
  SupplierBalanceStatus,
} from '@/shared/api/admin-suppliers';
import { packageFormFields, packageSearchLabel } from '@/views/admin/CRM/shared/PackageOrderSearch';

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

/** Статус строки ведомости: счёт сравнивается с закрытой оплатами суммой
 *  (FIFO-распределение оплат по самым ранним счетам), отдельная оплата без
 *  счёта — «Оплата» (аванс/переплата). */
export function getLedgerRowStatus(entry: {
  amount: number | null;
  payment: number | null;
  paidAmount?: number;
}): LedgerRowStatus | null {
  const amount = entry.amount ?? 0;
  const paid = entry.paidAmount ?? entry.payment ?? 0;
  if (amount > 0) {
    if (paid >= amount - 0.005) return 'PAID';
    if (paid > 0.005) return 'PARTIAL';
    return 'UNPAID';
  }
  if (entry.payment !== null && entry.payment !== 0) return 'PAYMENT_ONLY';
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

/** Подпись заказа в разбивке счёта: «заказчик · №договора» — теми же хелперами,
 *  что и панель «Поиск заказа» (читают только formData/title пакета). */
export function supplierOrderLinkLabel(link: AdminSupplierLedgerOrderLink): string {
  return packageSearchLabel(link.package as unknown as ContractDocumentPackage) || 'Заказ';
}

/** Компактная подпись договора в колонке «Договора»: только номер; если номера
 *  нет — заказчик/название пакета как резерв. */
export function supplierOrderContractLabel(link: AdminSupplierLedgerOrderLink): string {
  const fields = packageFormFields(link.package as unknown as ContractDocumentPackage);
  return fields.contractNumber ? `№${fields.contractNumber}` : supplierOrderLinkLabel(link);
}
