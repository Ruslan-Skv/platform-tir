import type { SupplierSettlementColumn } from './supplier-settlement-detail-page.types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const COLUMNS: SupplierSettlementColumn[] = [
  { key: '_index', title: '№п/п', type: 'index' },
  { key: 'date', title: 'Дата', type: 'date' },
  { key: 'invoice', title: 'Счёт', type: 'text' },
  { key: 'amount', title: 'Стоимость', type: 'number' },
  { key: 'payment', title: 'Оплата', type: 'number' },
  { key: 'note', title: 'Примечание', type: 'text' },
  { key: '_action', title: '', type: 'action' },
];

export const DEFAULT_COLUMN_WIDTHS = [50, 110, 100, 100, 100, 180, 36];
export const MIN_COL_WIDTH = 28;
export const MAX_COL_WIDTH = 400;
export const COL_WIDTH_STORAGE_KEY = 'supplier-settlement-column-widths';
export const VISIBLE_ROWS_STORAGE_KEY = 'supplier-settlement-visible-rows';
export const VISIBLE_ROW_OPTIONS = [15, 20, 25, 30, 35] as const;
export const ROW_HEIGHT = 27;
export const HEADER_ROW_HEIGHT = 22;
export const HEADER_ROWS_COUNT = 3;
export const UNDO_MAX_STEPS = 10;
export const AUTO_SAVE_DEBOUNCE_MS = 800;
