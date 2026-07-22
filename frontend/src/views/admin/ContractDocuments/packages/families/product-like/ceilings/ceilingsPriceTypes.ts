export const CEILINGS_PRICE_CATEGORIES = [
  'FABRIC',
  'TAPE',
  'PROFILE',
  'FABRIC_EXTRA',
  'GOODS',
] as const;

export type CeilingsPriceCategory = (typeof CEILINGS_PRICE_CATEGORIES)[number];

export const CEILINGS_PRICE_CATEGORY_LABELS: Record<CeilingsPriceCategory, string> = {
  FABRIC: 'Полотно',
  TAPE: 'Ленты',
  PROFILE: 'Профили и багеты',
  FABRIC_EXTRA: 'Доп. по полотну',
  GOODS: 'Товар',
};

export type CeilingsPriceListSettings = {
  fabricMarkup: number;
  profileMarkup: number;
  tapeMarkup: number;
  defaultExtraMarkupPercent: number;
  /** Общая наценка по блокам вкладки «Товар» (ключ = название группы). */
  goodsGroupMarkups: Record<string, number>;
};

export type CeilingsPriceItem = {
  id: string;
  category: CeilingsPriceCategory;
  name: string;
  unit: string;
  purchasePrice: number;
  markup: number | null;
  retailPrice: number;
  attributes: Record<string, unknown>;
  active: boolean;
  sortOrder: number;
};

export type CeilingsPriceListResponse = {
  kind: 'CEILINGS';
  settings: CeilingsPriceListSettings;
  items: CeilingsPriceItem[];
  updatedAt: string | null;
};

export function resolveCeilingsRetailPrice(
  item: Pick<CeilingsPriceItem, 'purchasePrice' | 'markup' | 'retailPrice'>
): number {
  if (Number.isFinite(item.retailPrice) && item.retailPrice > 0) return item.retailPrice;
  if (item.markup != null && item.markup > 0 && item.purchasePrice > 0) {
    return Math.round(item.purchasePrice * item.markup);
  }
  return Math.max(0, item.purchasePrice || 0);
}
