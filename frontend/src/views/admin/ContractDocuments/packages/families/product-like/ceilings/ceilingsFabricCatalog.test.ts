import { describe, expect, it } from 'vitest';

import {
  fabricHasColorOptions,
  groupFabricAdminBlocks,
  listFabricColors,
  listFabricSeries,
  listFabricTextures,
} from './ceilingsFabricCatalog';
import type { CeilingsPriceItem } from './ceilingsPriceTypes';

function item(
  partial: Partial<CeilingsPriceItem> & {
    id: string;
    name: string;
    attributes: Record<string, unknown>;
  }
): CeilingsPriceItem {
  return {
    category: 'FABRIC',
    unit: 'м²',
    purchasePrice: 0,
    markup: 2,
    retailPrice: 0,
    active: true,
    sortOrder: 1,
    ...partial,
  };
}

describe('ceilingsFabricCatalog', () => {
  const items: CeilingsPriceItem[] = [
    item({
      id: 't1',
      name: 'Матовый',
      attributes: { fabricLevel: 'TEXTURE', block: 'Фактуры', texture: 'Матовый' },
    }),
    item({
      id: 's1',
      name: 'Мцв320',
      retailPrice: 700,
      purchasePrice: 350,
      attributes: {
        fabricLevel: 'SERIES',
        block: 'Матовый',
        texture: 'Матовый',
        series: 'Мцв320',
        hasColorOptions: true,
      },
    }),
    item({
      id: 'c1',
      name: 'М03',
      attributes: {
        fabricLevel: 'COLOR',
        block: 'Мцв320',
        texture: 'Матовый',
        series: 'Мцв320',
        color: 'М03',
      },
    }),
  ];

  it('lists cascade options texture → series → color', () => {
    expect(listFabricTextures(items)).toEqual(['Матовый']);
    expect(listFabricSeries(items, 'Матовый').map((x) => x.name)).toEqual(['Мцв320']);
    expect(listFabricColors(items, 'Матовый', 'Мцв320').map((x) => x.name)).toEqual(['М03']);
    expect(fabricHasColorOptions(items[1]!)).toBe(true);
  });

  it('groups admin blocks like Excel smart tables', () => {
    const blocks = groupFabricAdminBlocks(items);
    expect(blocks.map((b) => b.key)).toEqual(['Фактуры', 'Матовый', 'Мцв320']);
    expect(blocks[2]?.level).toBe('COLOR');
  });
});
