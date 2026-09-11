import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';

import { estimateMatchesManagerFilter } from './estimatesListUtils';

function presetWith(fields: Partial<ContractEstimatePreset>): ContractEstimatePreset {
  return {
    id: 'est_1',
    title: 'Расчёт',
    categorySlug: 'repair',
    categoryName: 'Ремонт',
    calculatorDraft: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdById: null,
    ...fields,
  } as ContractEstimatePreset;
}

describe('estimateMatchesManagerFilter', () => {
  it('пропускает всё без выбранного менеджера', () => {
    expect(estimateMatchesManagerFilter(presetWith({ createdById: null }), '', new Map())).toBe(
      true
    );
  });

  it('находит расчёт по автору без привязки к договору', () => {
    const preset = presetWith({ createdById: 'user_a' });
    expect(estimateMatchesManagerFilter(preset, 'user_a', new Map())).toBe(true);
    expect(estimateMatchesManagerFilter(preset, 'user_b', new Map())).toBe(false);
  });

  it('находит расчёт по менеджеру привязанного договора', () => {
    const preset = presetWith({ createdById: null });
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
