import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';

import {
  type QuickEstimateCategoryInput,
  buildQuickEstimateDraft,
  buildQuickEstimatePreset,
  moveQuickEstimateCategory,
  parseQuickEstimateDraft,
  quickEstimateCategoryHasLines,
  quickEstimateEditBlockReason,
  quickEstimateResultingGroupKey,
  resolveQuickEstimateObjectAddress,
  validateQuickEstimateInput,
} from './packageEstimateQuickCreate';

function category(
  slug: string,
  overrides: Partial<QuickEstimateCategoryInput> = {}
): QuickEstimateCategoryInput {
  return {
    slug,
    name: slug === 'prochie' ? 'Прочие' : `Категория ${slug}`,
    lines: [],
    customItems: {},
    customItemsNoMarkup: false,
    ...overrides,
  };
}

describe('validateQuickEstimateInput', () => {
  const base = {
    title: 'ЖК Парк, кв. 54',
    customerBlockFilled: true,
    objectAddress: 'Москва, ул. Ленина, 1',
  };

  it('требует название', () => {
    expect(validateQuickEstimateInput({ ...base, title: '  ', categories: [] })?.field).toBe(
      'title'
    );
  });

  it('требует заполненный блок «Заказчик» на вкладке «Данные»', () => {
    expect(
      validateQuickEstimateInput({ ...base, customerBlockFilled: false, categories: [] })?.field
    ).toBe('customer');
  });

  it('требует адрес объекта', () => {
    expect(validateQuickEstimateInput({ ...base, objectAddress: '', categories: [] })?.field).toBe(
      'address'
    );
  });

  it('требует позиции с количеством', () => {
    const empty = category('okna', { lines: [{ itemId: 'item_1', quantity: 0 }] });
    expect(validateQuickEstimateInput({ ...base, categories: [category('okna')] })?.field).toBe(
      'lines'
    );
    expect(validateQuickEstimateInput({ ...base, categories: [empty] })?.field).toBe('lines');
  });

  it('проходит при заполненных полях', () => {
    const filled = category('okna', { lines: [{ itemId: 'item_1', quantity: 2 }] });
    expect(validateQuickEstimateInput({ ...base, categories: [filled] })).toBeNull();
  });
});

describe('buildQuickEstimateDraft', () => {
  it('кодирует черновик v1 с одним блоком «Работы» и кастомными позициями', () => {
    const draft = JSON.parse(
      buildQuickEstimateDraft(
        category('prochie', {
          lines: [
            { itemId: 'catalog_item', quantity: 3 },
            { itemId: 'est-custom:1', quantity: 1.5 },
            { itemId: 'catalog_item_zero', quantity: 0 },
          ],
          customItems: { 'est-custom:1': { name: 'Подъём', unit: 'час', price: 500 } },
          customItemsNoMarkup: true,
        })
      )
    );
    expect(draft.v).toBe(1);
    expect(draft.calcs).toHaveLength(1);
    expect(draft.calcs[0].name).toBe('Работы');
    expect(draft.calcs[0].lines).toEqual([
      { itemId: 'catalog_item', quantity: 3 },
      { itemId: 'est-custom:1', quantity: 1.5 },
    ]);
    expect(draft.customItems['est-custom:1']).toEqual({ name: 'Подъём', unit: 'час', price: 500 });
    expect(draft.customItemsNoMarkup).toBe(true);
  });
});

describe('resolveQuickEstimateObjectAddress', () => {
  const groups = [
    { id: 'g1', title: 'Москва, ул. Ленина, 1', updatedAt: '2026-01-01T00:00:00.000Z' },
  ];

  it('берёт адрес из заголовка зафиксированного объекта вкладки', () => {
    expect(
      resolveQuickEstimateObjectAddress({
        contractEstimateObjectKey: 'g1',
        estimateGroups: groups,
        packageObjectAddress: 'другой адрес',
      })
    ).toBe('Москва, ул. Ленина, 1');
  });

  it('без объекта вкладки берёт адрес из «Данных»', () => {
    expect(
      resolveQuickEstimateObjectAddress({
        contractEstimateObjectKey: '',
        estimateGroups: groups,
        packageObjectAddress: ' Москва, ул. Ленина, 2 ',
      })
    ).toBe('Москва, ул. Ленина, 2');
  });

  it('«Вне объекта» не подставляет заголовок группы', () => {
    expect(
      resolveQuickEstimateObjectAddress({
        contractEstimateObjectKey: '__ungrouped__',
        estimateGroups: groups,
        packageObjectAddress: 'Москва, ул. Ленина, 2',
      })
    ).toBe('Москва, ул. Ленина, 2');
  });
});

describe('quickEstimateResultingGroupKey', () => {
  it('находит группу по адресу (без учёта регистра/пробелов)', () => {
    expect(
      quickEstimateResultingGroupKey({
        objectAddress: '  москва, ул. Ленина, 1',
        estimateGroups: [{ id: 'g9', title: 'Москва, ул. Ленина, 1', updatedAt: '' }],
      })
    ).toBe('g9');
  });

  it('без адреса — вне объекта, без совпадения — новая группа', () => {
    const groups = [{ id: 'g1', title: 'Адрес 1', updatedAt: '' }];
    expect(quickEstimateResultingGroupKey({ objectAddress: '', estimateGroups: groups })).toBe(
      '__ungrouped__'
    );
    expect(
      quickEstimateResultingGroupKey({ objectAddress: 'Адрес 2', estimateGroups: groups })
    ).toBe('__new_group__');
  });
});

describe('quickEstimateCategoryHasLines', () => {
  it('учитывает только позиции каталога и кастомные с количеством > 0', () => {
    expect(quickEstimateCategoryHasLines(category('okna'))).toBe(false);
    expect(
      quickEstimateCategoryHasLines(
        category('okna', { lines: [{ itemId: 'est-custom:1', quantity: 2 }] })
      )
    ).toBe(true);
  });
});

describe('moveQuickEstimateCategory', () => {
  it('сдвигает категорию вверх и вниз, остальные — на её место', () => {
    const slugs = ['santehnika', 'elektrika', 'prochie'];
    expect(moveQuickEstimateCategory(slugs, 'elektrika', -1)).toEqual([
      'elektrika',
      'santehnika',
      'prochie',
    ]);
    expect(moveQuickEstimateCategory(slugs, 'elektrika', 1)).toEqual([
      'santehnika',
      'prochie',
      'elektrika',
    ]);
  });

  it('на границах списка и без категории — порядок не меняется', () => {
    const slugs = ['santehnika', 'elektrika'];
    expect(moveQuickEstimateCategory(slugs, 'santehnika', -1)).toBe(slugs);
    expect(moveQuickEstimateCategory(slugs, 'elektrika', 1)).toBe(slugs);
    expect(moveQuickEstimateCategory(slugs, 'okna', 1)).toBe(slugs);
  });
});

describe('buildQuickEstimatePreset', () => {
  it('собирает пресет с направлением, заказчиком и снимком по кастомным позициям', async () => {
    const preset = await buildQuickEstimatePreset({
      title: '  Жалюзи, кабинет  ',
      crmCustomerId: ' crm_7 ',
      customerName: 'Петров Пётр',
      objectAddress: 'Москва, ул. Строителей, 5',
      direction: 'BLINDS',
      actorUserId: 'user_1',
      additionalMarkupPercent: 10,
      categories: [
        category('prochie', {
          name: 'Прочие',
          lines: [{ itemId: 'est-custom:1', quantity: 4 }],
          customItems: { 'est-custom:1': { name: 'Монтаж жалюзи', unit: 'шт', price: 750 } },
        }),
      ],
    });

    expect(preset.id).toMatch(/^est_\d+$/);
    expect(preset.title).toBe('Жалюзи, кабинет');
    expect(preset.crmCustomerId).toBe('crm_7');
    expect(preset.customerName).toBe('Петров Пётр');
    expect(preset.objectAddress).toBe('Москва, ул. Строителей, 5');
    expect(preset.direction).toBe('BLINDS');
    expect(preset.createdById).toBe('user_1');
    expect(preset.additionalMarkupPercent).toBe(10);
    expect(preset.categorySlug).toBe('prochie');
    expect(preset.categoryName).toBe('Прочие');
    // Снимок считается локально по кастомным позициям (без запроса к каталогу).
    expect(preset.snapshot?.total).toBe(3000);
    expect(preset.snapshot?.rooms[0]?.lines[0]).toMatchObject({
      name: 'Монтаж жалюзи',
      quantity: 4,
      price: 750,
      amount: 3000,
    });
  });

  it('несколько категорий: комплексное имя и мета-черновик первой категории', async () => {
    const preset = await buildQuickEstimatePreset({
      title: 'Санузел + электрика',
      crmCustomerId: 'crm_1',
      customerName: 'Иванов Иван',
      objectAddress: 'Москва, ул. Ленина, 1',
      direction: 'REPAIR',
      categories: [
        category('santehnika', {
          name: 'Сантехника',
          lines: [{ itemId: 'est-custom:a', quantity: 1 }],
          customItems: { 'est-custom:a': { name: 'Замена смесителя', unit: 'шт', price: 2000 } },
        }),
        category('elektrika', {
          name: 'Электрика',
          lines: [{ itemId: 'est-custom:b', quantity: 5 }],
          customItems: { 'est-custom:b': { name: 'Розетка', unit: 'шт', price: 400 } },
        }),
      ],
    });

    expect(preset.categoryName).toBe('Комплексный расчёт: Сантехника, Электрика');
    expect(preset.multiCategorySlugs).toEqual(['santehnika', 'elektrika']);
    expect(preset.snapshot?.total).toBe(4000);
    // Комнаты снимка — в порядке категорий панели: порядок панели = порядок в смете/счёт-заказе.
    expect(preset.snapshot?.rooms[0]?.lines[0]?.name).toBe('Замена смесителя');
    expect(preset.snapshot?.rooms[1]?.lines[0]?.name).toBe('Розетка');
    const draft = JSON.parse(preset.calculatorDraft) as { __adminMultiCategory?: unknown };
    expect(draft.__adminMultiCategory).toBeDefined();
  });

  it('бросает ошибку без категорий с позициями', async () => {
    await expect(
      buildQuickEstimatePreset({
        title: 'Пусто',
        crmCustomerId: 'crm_1',
        customerName: 'Иванов Иван',
        objectAddress: 'Москва',
        direction: 'REPAIR',
        categories: [category('okna')],
      })
    ).rejects.toThrow('quick estimate: no categories with selected lines');
  });
});

describe('parseQuickEstimateDraft', () => {
  it('разбирает черновик с одним блоком: имя блока, позиции, кастомные', () => {
    const draftRaw = buildQuickEstimateDraft(
      category('prochie', {
        calcName: 'Кухня',
        lines: [
          { itemId: 'catalog_item', quantity: 2 },
          { itemId: 'est-custom:1', quantity: 3 },
        ],
        customItems: { 'est-custom:1': { name: 'Подъём', unit: 'час', price: 500 } },
        customItemsNoMarkup: true,
      })
    );
    const parsed = parseQuickEstimateDraft(draftRaw);
    expect(parsed).not.toBeNull();
    expect(parsed?.calcName).toBe('Кухня');
    expect(parsed?.lines).toEqual([
      { itemId: 'catalog_item', quantity: 2 },
      { itemId: 'est-custom:1', quantity: 3 },
    ]);
    expect(parsed?.customItems['est-custom:1']).toEqual({
      name: 'Подъём',
      unit: 'час',
      price: 500,
    });
    expect(parsed?.customItemsNoMarkup).toBe(true);
  });

  it('несколько непустых помещений — null (правка только в воркспейсе)', () => {
    const draftRaw = JSON.stringify({
      v: 1,
      activeCalcId: 'c1',
      calcs: [
        { id: 'c1', name: 'Кухня', collapsed: false, lines: [{ itemId: 'i1', quantity: 1 }] },
        { id: 'c2', name: 'Санузел', collapsed: false, lines: [{ itemId: 'i2', quantity: 2 }] },
      ],
    });
    expect(parseQuickEstimateDraft(draftRaw)).toBeNull();
  });

  it('пустой черновик и битый JSON — не null / null соответственно', () => {
    const empty = JSON.stringify({ v: 1, activeCalcId: 'c1', calcs: [] });
    expect(parseQuickEstimateDraft(empty)?.calcName).toBe('Работы');
    expect(parseQuickEstimateDraft('not json')).toBeNull();
  });
});

describe('quickEstimateEditBlockReason', () => {
  const simpleDraft = buildQuickEstimateDraft(
    category('okna', { lines: [{ itemId: 'i1', quantity: 1 }] })
  );

  function presetWith(overrides: Record<string, unknown>) {
    return {
      id: 'est_1',
      title: 'Расчёт',
      categorySlug: 'okna',
      categoryName: 'Окна',
      calculatorDraft: simpleDraft,
      ...overrides,
    } as unknown as ContractEstimatePreset;
  }

  it('простой расчёт — можно править здесь', () => {
    expect(quickEstimateEditBlockReason(presetWith({}))).toBeNull();
  });

  it('связанные экземпляры и разделение сметы — блокируются', () => {
    expect(quickEstimateEditBlockReason(presetWith({ splitBundleId: 'b1' }))).toContain(
      'связанными'
    );
    expect(
      quickEstimateEditBlockReason(presetWith({ estimateWorkScopeKeys: ['wsl:0:0'] }))
    ).toContain('связанными');
  });

  it('несколько помещений в черновике — блокируется', () => {
    const multiRooms = JSON.stringify({
      v: 1,
      activeCalcId: 'c1',
      calcs: [
        { id: 'c1', name: 'Кухня', collapsed: false, lines: [{ itemId: 'i1', quantity: 1 }] },
        { id: 'c2', name: 'Санузел', collapsed: false, lines: [{ itemId: 'i2', quantity: 2 }] },
      ],
    });
    expect(quickEstimateEditBlockReason(presetWith({ calculatorDraft: multiRooms }))).toContain(
      'несколькими помещениями'
    );
  });
});

describe('buildQuickEstimatePreset — правка существующего', () => {
  it('сохраняет id/группу/адрес/заказчика/служебные поля и сбрасывает наценку', async () => {
    const existing: ContractEstimatePreset = {
      id: 'est_999',
      title: 'Старое название',
      categorySlug: 'okna',
      categoryName: 'Окна',
      calculatorDraft: buildQuickEstimateDraft(
        category('okna', { lines: [{ itemId: 'est-custom:old', quantity: 1 }] })
      ),
      createdAt: '2026-10-01T00:00:00.000Z',
      createdById: 'user_author',
      groupId: 'g77',
      crmCustomerId: 'crm_1',
      customerName: 'Иванов Иван',
      objectAddress: 'Москва, ул. Ленина, 1',
      direction: 'WINDOWS',
      sourceMeasurementId: 'm1',
      inGroupListOrder: 42,
      additionalMarkupPercent: 15,
      snapshot: null,
    };

    const preset = await buildQuickEstimatePreset({
      title: 'Новое название',
      crmCustomerId: 'crm_OTHER',
      customerName: 'Другой',
      objectAddress: 'Другой адрес',
      direction: 'REPAIR',
      actorUserId: 'user_2',
      existing,
      categories: [
        category('okna', {
          name: 'Окна',
          lines: [{ itemId: 'est-custom:new', quantity: 2 }],
          customItems: { 'est-custom:new': { name: 'Монтаж', unit: 'шт', price: 900 } },
        }),
      ],
    });

    // Не переносится из параметров — берётся из существующего.
    expect(preset.id).toBe('est_999');
    expect(preset.createdAt).toBe('2026-10-01T00:00:00.000Z');
    expect(preset.createdById).toBe('user_author');
    expect(preset.groupId).toBe('g77');
    expect(preset.crmCustomerId).toBe('crm_1');
    expect(preset.customerName).toBe('Иванов Иван');
    expect(preset.objectAddress).toBe('Москва, ул. Ленина, 1');
    expect(preset.direction).toBe('WINDOWS');
    expect(preset.sourceMeasurementId).toBe('m1');
    expect(preset.inGroupListOrder).toBe(42);
    // Новое содержимое.
    expect(preset.title).toBe('Новое название');
    expect(preset.snapshot?.total).toBe(1800);
    // Наценка не задана — прежнее значение сброшено («наценка объекта»).
    expect(preset.additionalMarkupPercent).toBeUndefined();
    // Правка без позиций не падает (как в воркспейсе).
    const emptied = await buildQuickEstimatePreset({
      title: 'Пустой расчёт',
      crmCustomerId: 'crm_1',
      customerName: 'Иванов Иван',
      objectAddress: 'Москва, ул. Ленина, 1',
      direction: 'REPAIR',
      existing,
      categories: [category('okna', { name: 'Окна' })],
    });
    expect(emptied.snapshot).toBeNull();
  });
});

describe('validateQuickEstimateInput — правка', () => {
  const base = {
    title: 'Расчёт',
    customerBlockFilled: true,
    objectAddress: 'Москва',
  };

  it('при правке пустые позиции допустимы, при создании — нет', () => {
    const empty = [category('okna')];
    expect(validateQuickEstimateInput({ ...base, categories: empty })?.field).toBe('lines');
    expect(
      validateQuickEstimateInput({ ...base, categories: empty, isEditingExisting: true })
    ).toBeNull();
  });

  it('без категорий нельзя даже при правке', () => {
    expect(
      validateQuickEstimateInput({ ...base, categories: [], isEditingExisting: true })?.field
    ).toBe('categories');
  });
});
