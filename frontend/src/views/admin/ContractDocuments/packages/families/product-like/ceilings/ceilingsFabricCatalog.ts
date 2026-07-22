import type { CeilingsPriceItem } from './ceilingsPriceTypes';
import { resolveCeilingsRetailPrice } from './ceilingsPriceTypes';

export type CeilingsFabricLevel = 'TEXTURE' | 'SERIES' | 'COLOR';

export function fabricLevelOf(item: CeilingsPriceItem): CeilingsFabricLevel | null {
  const lv = item.attributes?.fabricLevel;
  if (lv === 'TEXTURE' || lv === 'SERIES' || lv === 'COLOR') return lv;
  // Legacy flat seed: treat priced fabric rows as SERIES.
  if (item.category === 'FABRIC') return 'SERIES';
  return null;
}

export function fabricAttrString(
  item: CeilingsPriceItem,
  key: 'texture' | 'series' | 'article' | 'color' | 'block'
): string {
  const v = item.attributes?.[key];
  return typeof v === 'string' ? v : '';
}

export function fabricHasColorOptions(item: CeilingsPriceItem): boolean {
  return item.attributes?.hasColorOptions === true;
}

export function listFabricTextures(items: CeilingsPriceItem[]): string[] {
  const fromLevel = items
    .filter((it) => it.active && it.category === 'FABRIC' && fabricLevelOf(it) === 'TEXTURE')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((it) => it.name);
  if (fromLevel.length) return [...new Set(fromLevel)];
  return [
    ...new Set(
      items
        .filter((it) => it.active && it.category === 'FABRIC' && fabricLevelOf(it) === 'SERIES')
        .map((it) => fabricAttrString(it, 'texture') || String(it.attributes?.texture ?? ''))
        .filter(Boolean)
    ),
  ];
}

export function listFabricSeries(items: CeilingsPriceItem[], texture: string): CeilingsPriceItem[] {
  if (!texture) return [];
  return items
    .filter(
      (it) =>
        it.active &&
        it.category === 'FABRIC' &&
        fabricLevelOf(it) === 'SERIES' &&
        (fabricAttrString(it, 'texture') || String(it.attributes?.texture ?? '')) === texture
    )
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru'));
}

export function listFabricColors(
  items: CeilingsPriceItem[],
  texture: string,
  series: string
): CeilingsPriceItem[] {
  if (!texture || !series) return [];
  return items
    .filter(
      (it) =>
        it.active &&
        it.category === 'FABRIC' &&
        fabricLevelOf(it) === 'COLOR' &&
        fabricAttrString(it, 'texture') === texture &&
        fabricAttrString(it, 'series') === series
    )
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru'));
}

export function findFabricSeriesItem(
  items: CeilingsPriceItem[],
  texture: string,
  series: string
): CeilingsPriceItem | undefined {
  return listFabricSeries(items, texture).find(
    (it) => it.name === series || fabricAttrString(it, 'series') === series
  );
}

export function resolveFabricSelectionPrice(
  items: CeilingsPriceItem[],
  texture: string,
  series: string
): number {
  const seriesItem = findFabricSeriesItem(items, texture, series);
  return seriesItem ? resolveCeilingsRetailPrice(seriesItem) : 0;
}

export type FabricAdminBlock = {
  key: string;
  title: string;
  level: CeilingsFabricLevel;
  items: CeilingsPriceItem[];
};

/** Admin «Полотно»: blocks like Excel smart tables (Фактуры / series / colors). */
export function groupFabricAdminBlocks(items: CeilingsPriceItem[]): FabricAdminBlock[] {
  const fabrics = items.filter((it) => it.category === 'FABRIC');
  const byBlock = new Map<string, CeilingsPriceItem[]>();
  for (const it of fabrics) {
    const level = fabricLevelOf(it);
    const block =
      fabricAttrString(it, 'block') ||
      (level === 'TEXTURE' ? 'Фактуры' : fabricAttrString(it, 'texture') || 'Прочее');
    if (!byBlock.has(block)) byBlock.set(block, []);
    byBlock.get(block)!.push(it);
  }

  const preferredOrder = [
    'Фактуры',
    'Матовый',
    'Сатиновый',
    'Лаковый',
    'Фактурный',
    'Светопр.пленка',
    'Перфорация',
    'Дерево',
  ];

  const keys = [...byBlock.keys()].sort((a, b) => {
    const ia = preferredOrder.indexOf(a);
    const ib = preferredOrder.indexOf(b);
    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }
    return a.localeCompare(b, 'ru');
  });

  return keys.map((key) => {
    const blockItems = (byBlock.get(key) || []).sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru')
    );
    const level = fabricLevelOf(blockItems[0]!) ?? 'SERIES';
    const title =
      level === 'TEXTURE'
        ? 'Фактуры (1-й список)'
        : level === 'SERIES'
          ? `Серии · ${key} (2-й список)`
          : `Цвета · ${key} (3-й список)`;
    return { key, title, level, items: blockItems };
  });
}
