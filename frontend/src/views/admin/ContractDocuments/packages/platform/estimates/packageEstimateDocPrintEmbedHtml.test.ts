import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';

import { buildEstimateSectionsFromPresetIds } from './packageEstimateDocPrintEmbedHtml';

const ROOM_NAMES = ['Гостиная', 'Спальня', 'Кухня'];

const CATEGORY_DEFS = [
  { slug: 'poly', name: 'Работы по полам' },
  { slug: 'maljarnye', name: 'Малярные работы' },
  { slug: 'steny', name: 'Стены' },
];

/**
 * Комплексный расчёт: 3 категории × 3 помещения = 9 помещений в объединённом снимке
 * (как при сохранении из воркспейса: снимки категорий склеиваются по порядку slug'ов).
 */
function multiCategoryPreset(estimateWorkScopeKeys?: string[]): ContractEstimatePreset {
  const rooms = CATEGORY_DEFS.flatMap((cat) =>
    ROOM_NAMES.map((roomName) => ({
      name: roomName,
      total: 100,
      lines: [
        { name: `${cat.name}: ${roomName}`, unit: 'м²', quantity: 1, price: 100, amount: 100 },
      ],
    }))
  );
  const categories = CATEGORY_DEFS.map((cat) => ({
    slug: cat.slug,
    name: cat.name,
    roomCount: ROOM_NAMES.length,
    total: 300,
  }));
  const calculatorDraft = JSON.stringify({
    v: 1,
    activeCalcId: '',
    calcs: [],
    __adminMultiCategory: { slugs: CATEGORY_DEFS.map((c) => c.slug), categories },
  });
  return {
    id: 'est_split',
    title: 'Трёшка (ремонт)',
    categorySlug: 'poly',
    categoryName: 'Комплексный расчёт: Работы по полам, Малярные работы, Стены',
    calculatorDraft,
    snapshot: { total: 900, rooms },
    ...(estimateWorkScopeKeys ? { estimateWorkScopeKeys } : {}),
  } as ContractEstimatePreset;
}

describe('buildEstimateSectionsFromPresetIds: комплексный расчёт', () => {
  it('без границ работ режет снимок по категориям позиционно (3 категории × 3 помещения)', () => {
    const preset = multiCategoryPreset();
    const sections = buildEstimateSectionsFromPresetIds([preset.id], [preset], []);
    expect(sections.map((s) => s.categoryName)).toEqual(CATEGORY_DEFS.map((c) => c.name));
    expect(sections.map((s) => s.rooms.length)).toEqual([3, 3, 3]);
    expect(sections[0].rooms.map((r) => r.name)).toEqual(ROOM_NAMES);
  });

  it('после фильтра границ работ помещения попадают в свои категории по исходным индексам', () => {
    // В договор выбрана только «Гостиная» из каждой категории: ключи wsl:<индекс помещения>:<индекс строки>.
    const scopeKeys = ['wsl:0:0', 'wsl:3:0', 'wsl:6:0'];
    const preset = multiCategoryPreset(scopeKeys);
    const sections = buildEstimateSectionsFromPresetIds([preset.id], [preset], []);

    expect(sections.map((s) => s.categoryName)).toEqual(CATEGORY_DEFS.map((c) => c.name));
    expect(sections.map((s) => s.rooms.length)).toEqual([1, 1, 1]);
    for (const section of sections) {
      expect(section.rooms[0].name).toBe('Гостиная');
    }
    // Помещение каждой категории — именно её строка, а не строки первой категории.
    expect(sections.map((s) => s.rooms[0].lines[0].name)).toEqual(
      CATEGORY_DEFS.map((c) => `${c.name}: Гостиная`)
    );
  });

  it('после фильтра остаются только категории с выбранными помещениями', () => {
    // «Гостиная» только в «Малярных работах» (индекс помещения 3) и «Стенах» (индекс 6).
    const preset = multiCategoryPreset(['wsl:3:0', 'wsl:6:0']);
    const sections = buildEstimateSectionsFromPresetIds([preset.id], [preset], []);
    expect(sections.map((s) => s.categoryName)).toEqual(['Малярные работы', 'Стены']);
    expect(sections.every((s) => s.rooms.length === 1)).toBe(true);
  });
});
