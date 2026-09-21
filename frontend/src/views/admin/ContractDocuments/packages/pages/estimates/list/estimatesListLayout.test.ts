import {
  type EstimatesTableDisplayItem,
  buildEstimateLayoutBlocks,
  paginateEstimatesTableDisplayItems,
} from './estimatesListLayout';

type Item = EstimatesTableDisplayItem & { id?: string };

function addressItem(id: string): Item {
  return { type: 'address', addressKey: id, items: [] };
}

function estimateItem(id: string): Item {
  return { type: 'estimate', preset: { id } as never };
}

describe('paginateEstimatesTableDisplayItems', () => {
  const items: Item[] = [
    addressItem('a'),
    estimateItem('e1'),
    { type: 'gap', id: 'g1' },
    addressItem('b'),
    estimateItem('e2'),
    { type: 'gap', id: 'g2' },
    estimateItem('e3'),
  ];

  it('лимит страницы — по строкам без gap; внутренние gap сохраняются', () => {
    const page1 = paginateEstimatesTableDisplayItems(items, 1, 3);
    expect(page1.map((x) => x.type)).toEqual(['address', 'estimate', 'gap', 'address']);

    const page2 = paginateEstimatesTableDisplayItems(items, 2, 3);
    expect(page2.map((x) => x.type)).toEqual(['estimate', 'gap', 'estimate']);
  });

  it('хвостовые и ведущие gap страницы отбрасываются', () => {
    // Ведущий: страница 2 не начинается с gap перед своим первым объектом.
    const page2 = paginateEstimatesTableDisplayItems(items, 2, 3);
    expect(page2[0].type).not.toBe('gap');
    // Хвостовой: на странице 1 нет gap после последней строки.
    const page1 = paginateEstimatesTableDisplayItems(items, 1, 3);
    expect(page1.at(-1)?.type).not.toBe('gap');
  });

  it('пустая страница за пределами списка', () => {
    expect(paginateEstimatesTableDisplayItems(items, 9, 3)).toEqual([]);
  });
});

describe('buildEstimateLayoutBlocks: сортировка объектов по дате', () => {
  const usage = new Map<string, never[]>();
  const preset = (id: string, address: string, iso: string) =>
    ({ id, title: id, objectAddress: address, updatedAt: iso }) as never;

  const items = [
    preset('old_a', 'ул. Старая, 1', '2026-01-01T00:00:00.000Z'),
    preset('new_a', 'ул. Старая, 1', '2026-03-01T00:00:00.000Z'),
    preset('mid_b', 'ул. Новая, 2', '2026-02-01T00:00:00.000Z'),
  ] as never[];

  const addressKeys = (sortBy: 'date' | 'binding', sortOrder: 'asc' | 'desc') =>
    buildEstimateLayoutBlocks({
      visibleItems: items,
      groups: [],
      archiveView: false,
      listViewMode: 'by_object',
      listSortBy: sortBy,
      listSortOrder: sortOrder,
      usageByEstimateId: usage,
    })
      .filter((b) => b.kind === 'address')
      .map((b) => (b as { addressKey: string }).addressKey);

  it('desc — объект с самым свежим расчётом первым', () => {
    expect(addressKeys('date', 'desc')).toEqual(['ул. Старая, 1', 'ул. Новая, 2']);
  });

  it('asc — самый старый объект первым', () => {
    expect(addressKeys('date', 'asc')).toEqual(['ул. Новая, 2', 'ул. Старая, 1']);
  });

  it('не дата — прежний порядок по адресу', () => {
    expect(addressKeys('binding', 'asc')).toEqual(
      ['ул. Старая, 1', 'ул. Новая, 2'].sort((a, b) => a.localeCompare(b, 'ru'))
    );
  });
});
