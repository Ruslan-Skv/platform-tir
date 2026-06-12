import { normalizeWindowsWorkOrderMarkupPercent } from '../../families/product-like/print/productWorkOrder';

export function formatMarkupPercentInput(value: number): string {
  return String(normalizeWindowsWorkOrderMarkupPercent(value));
}

export function parseMarkupPercentInput(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const n = Number.parseFloat(trimmed);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.trunc(n);
}
