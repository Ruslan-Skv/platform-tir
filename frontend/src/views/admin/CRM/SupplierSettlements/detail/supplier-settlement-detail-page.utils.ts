import {
  COLUMNS,
  COL_WIDTH_STORAGE_KEY,
  DEFAULT_COLUMN_WIDTHS,
  MAX_COL_WIDTH,
  MIN_COL_WIDTH,
  VISIBLE_ROWS_STORAGE_KEY,
  VISIBLE_ROW_OPTIONS,
} from './supplier-settlement-detail-page.constants';
import type { SupplierSettlementRow } from './supplier-settlement-detail-page.types';

export function createEmptyRow(id?: string): SupplierSettlementRow {
  return {
    id: id ?? `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    date: '',
    invoice: '',
    amount: null,
    payment: null,
    note: '',
  };
}

export function getInitialRows(): SupplierSettlementRow[] {
  return Array.from({ length: 5 }, () => createEmptyRow());
}

export function formatSum(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function loadColumnWidths(supplierId: string): number[] {
  if (typeof window === 'undefined') return [...DEFAULT_COLUMN_WIDTHS];
  const key = supplierId ? `${COL_WIDTH_STORAGE_KEY}-${supplierId}` : COL_WIDTH_STORAGE_KEY;
  try {
    const s = window.localStorage.getItem(key);
    if (!s) return [...DEFAULT_COLUMN_WIDTHS];
    const parsed = JSON.parse(s) as number[];
    if (Array.isArray(parsed) && parsed.length === COLUMNS.length) {
      return parsed.map((w) => Math.max(MIN_COL_WIDTH, Math.min(MAX_COL_WIDTH, w)));
    }
  } catch {
    /* ignore */
  }
  return [...DEFAULT_COLUMN_WIDTHS];
}

export function saveColumnWidths(supplierId: string, widths: number[]) {
  if (typeof window !== 'undefined') {
    const key = supplierId ? `${COL_WIDTH_STORAGE_KEY}-${supplierId}` : COL_WIDTH_STORAGE_KEY;
    window.localStorage.setItem(key, JSON.stringify(widths));
  }
}

export function loadVisibleRowCount(): (typeof VISIBLE_ROW_OPTIONS)[number] {
  if (typeof window === 'undefined') return 20;
  try {
    const s = window.localStorage.getItem(VISIBLE_ROWS_STORAGE_KEY);
    if (s) {
      const n = Number(s);
      if (VISIBLE_ROW_OPTIONS.includes(n as (typeof VISIBLE_ROW_OPTIONS)[number])) {
        return n as (typeof VISIBLE_ROW_OPTIONS)[number];
      }
    }
  } catch {
    /* ignore */
  }
  return 20;
}

export function saveVisibleRowCount(count: number) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(VISIBLE_ROWS_STORAGE_KEY, String(count));
  }
}

export function parseNumeric(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed.replace(/\s/g, '').replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}
