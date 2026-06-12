import { DEFAULT_VISIBLE_COLUMNS, STORAGE_KEY } from './suppliers-page.constants';
import type { ColumnKey } from './suppliers-page.types';

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.startsWith('7') && digits.length === 11) {
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
  }

  if (digits.length === 10) {
    return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
  }

  return phone;
}

export function loadColumnSettings(): ColumnKey[] {
  if (typeof window === 'undefined') {
    return [...DEFAULT_VISIBLE_COLUMNS];
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as ColumnKey[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.includes('actions') ? parsed : [...parsed, 'actions'];
      }
    }
  } catch {
    /* ignore */
  }

  return [...DEFAULT_VISIBLE_COLUMNS];
}

export function saveColumnSettings(columns: ColumnKey[]) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
    } catch {
      /* ignore */
    }
  }
}

export function ensureActionsColumn(columns: ColumnKey[]): ColumnKey[] {
  return columns.includes('actions') ? columns : [...columns, 'actions'];
}
