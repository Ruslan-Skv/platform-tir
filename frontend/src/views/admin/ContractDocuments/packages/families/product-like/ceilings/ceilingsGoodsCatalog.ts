import type { CeilingsPriceItem } from './ceilingsPriceTypes';

export const CEILINGS_GOODS_GROUP_ORDER = [
  'Светильники и лампы',
  'Светодиодная лента и комплектующие к ней',
  'Световые линии с комплектующими',
  'Гардины',
  'Карнизы',
] as const;

/** Наценки по умолчанию как в Excel «СЗ на товар» (базовая ≈ ×1, закуп с наценкой ×1.8). */
export const DEFAULT_CEILINGS_GOODS_GROUP_MARKUPS: Record<string, number> = {
  'Светильники и лампы': 1,
  'Светодиодная лента и комплектующие к ней': 1,
  'Световые линии с комплектующими': 1.8,
  Гардины: 1.8,
  Карнизы: 1,
};

export type GoodsAdminBlock = {
  key: string;
  title: string;
  items: CeilingsPriceItem[];
};

export function goodsGroupOf(item: CeilingsPriceItem): string {
  const g = item.attributes?.goodsGroup ?? item.attributes?.block;
  return typeof g === 'string' && g.trim() ? g.trim() : 'Прочее';
}

export function resolveGoodsGroupMarkup(
  group: string,
  markups?: Record<string, number> | null
): number {
  const fromSettings = markups?.[group];
  if (typeof fromSettings === 'number' && Number.isFinite(fromSettings) && fromSettings > 0) {
    return fromSettings;
  }
  const fallback = DEFAULT_CEILINGS_GOODS_GROUP_MARKUPS[group];
  if (typeof fallback === 'number' && fallback > 0) return fallback;
  return 1;
}

export function applyGoodsGroupMarkupToItem(
  item: CeilingsPriceItem,
  markup: number
): CeilingsPriceItem {
  const m = Number.isFinite(markup) && markup > 0 ? markup : 1;
  const purchase = Number(item.purchasePrice) || 0;
  return {
    ...item,
    markup: m,
    retailPrice: purchase > 0 ? Math.round(purchase * m) : 0,
  };
}

export function normalizeGoodsGroupMarkups(
  raw?: Record<string, number> | null
): Record<string, number> {
  const out: Record<string, number> = { ...DEFAULT_CEILINGS_GOODS_GROUP_MARKUPS };
  if (raw && typeof raw === 'object') {
    for (const [key, value] of Object.entries(raw)) {
      const n = Number(value);
      if (key.trim() && Number.isFinite(n) && n > 0) out[key] = n;
    }
  }
  return out;
}

export function groupGoodsAdminBlocks(items: CeilingsPriceItem[]): GoodsAdminBlock[] {
  const goods = items.filter((it) => it.category === 'GOODS');
  const byGroup = new Map<string, CeilingsPriceItem[]>();
  for (const it of goods) {
    const key = goodsGroupOf(it);
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(it);
  }

  const keys = [...byGroup.keys()].sort((a, b) => {
    const ia = (CEILINGS_GOODS_GROUP_ORDER as readonly string[]).indexOf(a);
    const ib = (CEILINGS_GOODS_GROUP_ORDER as readonly string[]).indexOf(b);
    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }
    return a.localeCompare(b, 'ru');
  });

  return keys.map((key) => ({
    key,
    title: key,
    items: (byGroup.get(key) || []).sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru')
    ),
  }));
}

export function listGoodsGroups(items: CeilingsPriceItem[]): string[] {
  return groupGoodsAdminBlocks(items.filter((it) => it.active)).map((b) => b.key);
}

export function listGoodsInGroup(items: CeilingsPriceItem[], group: string): CeilingsPriceItem[] {
  if (!group) return [];
  return items
    .filter((it) => it.active && it.category === 'GOODS' && goodsGroupOf(it) === group)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru'));
}
