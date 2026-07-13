export type SupplierPriceListCategory =
  | 'TRIM'
  | 'INTERIOR_DOOR'
  | 'STEEL_DOOR'
  | 'HARDWARE'
  | 'ARCH'
  | 'ACCORDION';

export const SUPPLIER_PRICE_LIST_CATEGORIES: SupplierPriceListCategory[] = [
  'TRIM',
  'INTERIOR_DOOR',
  'STEEL_DOOR',
  'HARDWARE',
  'ARCH',
  'ACCORDION',
];

export const PRICE_LIST_CATEGORY_LABELS: Record<SupplierPriceListCategory, string> = {
  TRIM: 'Погонаж',
  INTERIOR_DOOR: 'Межкомнатные двери',
  STEEL_DOOR: 'Стальные двери',
  HARDWARE: 'Фурнитура',
  ARCH: 'Арки',
  ACCORDION: 'Гармошки',
};

export const PRICE_LIST_CATEGORY_SHEETS: Record<SupplierPriceListCategory, string> = {
  TRIM: 'Межкомнатные двери с фото',
  INTERIOR_DOOR: 'Межкомнатные двери с фото',
  STEEL_DOOR: 'Стальные двери с фото',
  HARDWARE: 'Фурнитура с фото',
  ARCH: 'Арки с фото',
  ACCORDION: 'Гармошки с фото',
};

export type ParsedPriceListRow = {
  rowKey: string;
  blockTitle: string;
  color: string;
  itemName: string;
  size: string | null;
  material: string | null;
  variantNote: string | null;
  priceRrc: number;
};

export type ParsedPriceList = {
  priceListDate: string | null;
  sheetName: string;
  parserCode: string;
  category: SupplierPriceListCategory;
  rows: ParsedPriceListRow[];
};

export type PriceListDiffStatus = 'unchanged' | 'changed' | 'added' | 'removed';

export type PriceListDiffRow = {
  status: PriceListDiffStatus;
  rowKey: string;
  blockTitle: string;
  color: string;
  itemName: string;
  size: string | null;
  material: string | null;
  variantNote: string | null;
  previousPrice: number | null;
  currentPrice: number | null;
  delta: number | null;
  catalogItemId: string | null;
  catalogItemLabel: string | null;
};
