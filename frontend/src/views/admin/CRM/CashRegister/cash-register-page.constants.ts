import type { CashRegisterColumn, CashRegisterRow } from './cash-register-page.types';

export const TEXT_COLUMN_KEYS = new Set<keyof CashRegisterRow>([
  'orders',
  'materials',
  'suppliers',
  'salary',
  'other',
]);

export const NUMERIC_KEYS: (keyof CashRegisterRow)[] = ['kp', 'kr', 'ap', 'ar', 'sp', 'sr', 'lk'];

export const COLUMNS: CashRegisterColumn[] = [
  { key: '_index', title: '№ п/п', type: 'index' },
  { key: 'date', title: 'Дата', type: 'date' },
  { key: 'orders', title: '№ договора', type: 'text' },
  { key: 'materials', title: 'Тип операции', type: 'text' },
  { key: 'salary', title: 'ФИО', type: 'text' },
  { key: 'suppliers', title: 'Поставщики', type: 'text' },
  { key: 'other', title: 'Прочее', type: 'text' },
  { key: 'kp', title: 'Кп', type: 'number' },
  { key: 'kr', title: 'Кр', type: 'number' },
  { key: 'ap', title: 'Ап', type: 'number' },
  { key: 'ar', title: 'Ар', type: 'number' },
  { key: 'sp', title: 'Сп', type: 'number' },
  { key: 'sr', title: 'Ср', type: 'number' },
  { key: 'lk', title: 'Лк', type: 'number' },
  { key: '_action', title: '', type: 'action' },
];

export const GREEN_COLUMN_KEYS = new Set<keyof CashRegisterRow>(['kp', 'ap', 'sp', 'lk']);
export const RED_COLUMN_KEYS = new Set<keyof CashRegisterRow>(['kr', 'ar', 'sr']);
export const SUM_COLUMN_KEYS = new Set<keyof CashRegisterRow>([
  'kp',
  'kr',
  'ap',
  'ar',
  'sp',
  'sr',
  'lk',
]);

export const DEFAULT_COLUMN_WIDTHS = [36, 110, 70, 90, 55, 90, 55, 55, 55, 55, 55, 55, 55, 55, 36];
export const MIN_COL_WIDTH = 28;
export const MAX_COL_WIDTH = 400;

export const COL_WIDTH_STORAGE_KEY = 'cash-register-column-widths';
export const VISIBLE_ROWS_STORAGE_KEY = 'cash-register-visible-rows';
export const VISIBLE_ROW_OPTIONS = [15, 20, 25, 30, 35] as const;
export const ROW_HEIGHT = 27;
export const HEADER_ROW_HEIGHT = 22;
export const HEADER_ROWS_COUNT = 3;
export const UNDO_MAX_STEPS = 20;
