import {
  COLUMNS,
  COL_WIDTH_STORAGE_KEY,
  DEFAULT_COLUMN_WIDTHS,
  MAX_COL_WIDTH,
  MIN_COL_WIDTH,
  VISIBLE_ROWS_STORAGE_KEY,
  VISIBLE_ROW_OPTIONS,
} from './cash-register-page.constants';
import type { CashRegisterRow } from './cash-register-page.types';

export function createEmptyRow(id?: string): CashRegisterRow {
  return {
    id: id ?? `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    date: '',
    orders: '',
    materials: '',
    suppliers: '',
    salary: '',
    other: '',
    kp: null,
    kr: null,
    ap: null,
    ar: null,
    sp: null,
    sr: null,
    lk: null,
  };
}

export function getInitialRows(): CashRegisterRow[] {
  return Array.from({ length: 10 }, () => createEmptyRow());
}

export function loadColumnWidths(): number[] {
  if (typeof window === 'undefined') return [...DEFAULT_COLUMN_WIDTHS];
  try {
    const s = window.localStorage.getItem(COL_WIDTH_STORAGE_KEY);
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

export function saveColumnWidths(widths: number[]) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(COL_WIDTH_STORAGE_KEY, JSON.stringify(widths));
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

export function formatSum(value: number): string {
  if (value === 0) return '0';
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function parseNumeric(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed.replace(/\s/g, '').replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}
