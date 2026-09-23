import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';

import {
  estimateMatchesManagerFilter,
  formatEstimateGroupAuthorLabel,
  sortEstimatesForList,
} from './estimatesListUtils';

function presetWith(fields: Partial<ContractEstimatePreset>): ContractEstimatePreset {
  return {
    id: 'est_1',
    title: 'Расчёт',
    categorySlug: 'repair',
    categoryName: 'Ремонт',
    calculatorDraft: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...fields,
  } as ContractEstimatePreset;
}

describe('estimateMatchesManagerFilter', () => {
  it('пропускает всё без выбранного менеджера', () => {
    expect(
      estimateMatchesManagerFilter(presetWith({ createdById: undefined }), '', new Map())
    ).toBe(true);
  });

  it('находит расчёт по автору без привязки к договору', () => {
    const preset = presetWith({ createdById: 'user_a' });
    expect(estimateMatchesManagerFilter(preset, 'user_a', new Map())).toBe(true);
    expect(estimateMatchesManagerFilter(preset, 'user_b', new Map())).toBe(false);
  });

  it('находит расчёт по менеджеру привязанного договора', () => {
    const preset = presetWith({ createdById: undefined });
    const managerIdsByPresetId = new Map([['est_1', new Set(['user_b'])]]);
    expect(estimateMatchesManagerFilter(preset, 'user_b', managerIdsByPresetId)).toBe(true);
    expect(estimateMatchesManagerFilter(preset, 'user_a', managerIdsByPresetId)).toBe(false);
  });

  it('совпадает и по автору, и по менеджеру договора', () => {
    const preset = presetWith({ createdById: 'user_a' });
    const managerIdsByPresetId = new Map([['est_1', new Set(['user_b'])]]);
    expect(estimateMatchesManagerFilter(preset, 'user_a', managerIdsByPresetId)).toBe(true);
    expect(estimateMatchesManagerFilter(preset, 'user_b', managerIdsByPresetId)).toBe(true);
  });
});

describe('formatEstimateGroupAuthorLabel', () => {
  it('берёт автора самого свежего расчёта объекта', () => {
    const items = [
      presetWith({
        id: 'est_old',
        createdByName: 'Старый Автор',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
      presetWith({
        id: 'est_new',
        createdByName: 'Новый Автор',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      }),
    ];
    expect(formatEstimateGroupAuthorLabel(items)).toBe('Новый Автор');
  });

  it('свежесть по updatedAt: правка старого расчёта делает его автора актуальным', () => {
    const items = [
      presetWith({
        id: 'est_a',
        createdByName: 'Автор А',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      }),
      presetWith({
        id: 'est_b',
        createdByName: 'Автор Б',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-06-01T00:00:00.000Z',
      }),
    ];
    expect(formatEstimateGroupAuthorLabel(items)).toBe('Автор Б');
  });

  it('«—», если у самого свежего расчёта нет автора', () => {
    const items = [
      presetWith({ id: 'est_no_author', createdByName: undefined }),
      presetWith({
        id: 'est_old_author',
        createdByName: 'Старый Автор',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      }),
    ];
    expect(formatEstimateGroupAuthorLabel(items)).toBe('—');
  });

  it('«—» для пустого списка расчётов', () => {
    expect(formatEstimateGroupAuthorLabel([])).toBe('—');
  });
});

describe('sortEstimatesForList: по привязке', () => {
  const bound = presetWith({ id: 'est_bound', title: 'Привязанный' });
  const free = presetWith({ id: 'est_free', title: 'Свободный' });
  const usageByEstimateId = new Map([
    ['est_bound', [{ contractNumber: '1', contractDate: '' }] as never],
  ]);

  it('asc — непривязанные раньше привязанных', () => {
    const sorted = sortEstimatesForList([bound, free], 'binding', 'asc', usageByEstimateId);
    expect(sorted.map((p) => p.id)).toEqual(['est_free', 'est_bound']);
  });

  it('desc — привязанные раньше непривязанных', () => {
    const sorted = sortEstimatesForList([free, bound], 'binding', 'desc', usageByEstimateId);
    expect(sorted.map((p) => p.id)).toEqual(['est_bound', 'est_free']);
  });

  it('без карты привязок порядок не меняется (кроме tie-breaker по названию)', () => {
    const sorted = sortEstimatesForList([free, bound], 'binding', 'asc');
    expect(sorted.map((p) => p.id)).toEqual(['est_bound', 'est_free']);
  });
});
