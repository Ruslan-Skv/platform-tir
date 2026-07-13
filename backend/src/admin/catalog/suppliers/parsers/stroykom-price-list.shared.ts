import type { SupplierPriceListCategory } from './price-list-parser.types';

export const PARSER_CODE = 'STROYKOM_MK';

export function normalizePriceListText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .replace(/[«»"']/g, '')
    .trim();
}

export function parseRrcPrice(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  const raw = String(value).trim();
  const rubMatch = raw.match(/(\d[\d\s]*(?:[,.]\d+)?)\s*руб/i);
  if (rubMatch) {
    return parseNumericPrice(rubMatch[1]);
  }

  return parseNumericPrice(raw);
}

function parseNumericPrice(value: string): number | null {
  let normalized = value.replace(/\s/g, '');
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(normalized)) {
    normalized = normalized.replace(/,/g, '');
  } else if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(normalized)) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = normalized.replace(',', '.');
  }

  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function extractPriceListDate(rows: unknown[][]): string | null {
  for (const row of rows.slice(0, 20)) {
    const text = row.map((c) => String(c ?? '')).join(' ');
    const match = text.match(/ПРАЙС-ЛИСТ\s+от\s+([\d.]+)/i);
    if (match) return match[1];
  }
  return null;
}

export function buildPriceListRowKey(
  category: SupplierPriceListCategory,
  parts: {
    blockTitle: string;
    color: string;
    itemName: string;
    size: string | null;
    material: string | null;
    variantNote: string | null;
  },
): string {
  return [
    category,
    normalizePriceListText(parts.blockTitle),
    normalizePriceListText(parts.color),
    normalizePriceListText(parts.itemName),
    normalizePriceListText(parts.size ?? ''),
    normalizePriceListText(parts.material ?? ''),
    normalizePriceListText(parts.variantNote ?? ''),
  ].join('|');
}

export function findSheetByName(workbook: { SheetNames: string[] }, target: string) {
  const exact = workbook.SheetNames.find((name) => name === target);
  if (exact) return exact;
  const normalized = normalizePriceListText(target);
  return workbook.SheetNames.find((name) => normalizePriceListText(name) === normalized);
}
