import { normalizeWindowsWorkOrderMarkupPercent } from '../../families/product-like/print/productWorkOrder';

export function formatMarkupPercentInput(value: number | null): string {
  return String(normalizeWindowsWorkOrderMarkupPercent(value ?? 0));
}

export function parseMarkupPercentInput(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const n = Number.parseFloat(trimmed);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.trunc(n);
}

/**
 * Цена одного угла заказ-наряда потолков, ₽: пусто → null (строка «Углы» не добавляется),
 * иначе целое число ≥ 0; 'invalid' — ошибка ввода.
 */
export function parseCornerPriceInput(raw: string): number | null | 'invalid' {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return 'invalid';
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) && n >= 0 ? n : 'invalid';
}

export function formatCornerPriceInput(value: number | null): string {
  return value == null ? '' : String(value);
}
