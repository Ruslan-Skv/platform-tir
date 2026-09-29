import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';

import { defaultPackageFormData } from '../form/defaults';
import { applyEstimatePresetIdsToAddendumSlot } from './applyEstimatePresetIds';

function preset(id: string, groupId: string | null): ContractEstimatePreset {
  return {
    id,
    title: `Расчёт ${id}`,
    categoryName: 'Двери',
    groupId,
    snapshot: {
      total: 1000,
      rooms: [
        {
          name: 'Помещение',
          total: 1000,
          lines: [{ name: 'Работа', unit: 'шт.', quantity: 1, price: 1000, amount: 1000 }],
        },
      ],
    },
  } as unknown as ContractEstimatePreset;
}

describe('applyEstimatePresetIdsToAddendumSlot objectKeyOverride', () => {
  it('без ключа формы и override прикрепление отклоняется (прежнее поведение)', () => {
    const form = defaultPackageFormData();
    const next = applyEstimatePresetIdsToAddendumSlot(form, 0, ['p1'], [preset('p1', 'g1')]);
    expect(next).toBe(form);
  });

  it('прикрепляет расчёт объекта из override и фиксирует estimateObjectGroupKey', () => {
    const form = defaultPackageFormData();
    expect(form.estimateObjectGroupKey).toBe('');
    const next = applyEstimatePresetIdsToAddendumSlot(
      form,
      0,
      ['p1'],
      [preset('p1', 'g1')],
      [],
      'additional',
      false,
      'g1'
    );
    expect(next.addendumSlots[0].selectedPresetIds).toEqual(['p1']);
    // Объект фиксируется, как при первом прикреплении к основной смете.
    expect(next.estimateObjectGroupKey).toBe('g1');
    // Суммы основного договора не пересчитываются.
    expect(next.contract.totalAmount).toBe(form.contract.totalAmount);
  });

  it('расчёт чужого объекта отсекается даже при override', () => {
    const form = defaultPackageFormData();
    const next = applyEstimatePresetIdsToAddendumSlot(
      form,
      0,
      ['p2'],
      [preset('p2', 'g2')],
      [],
      'additional',
      false,
      'g1'
    );
    expect(next.addendumSlots[0].selectedPresetIds).toEqual([]);
    expect(next.estimateObjectGroupKey).toBe('');
  });

  it('не перезаписывает ключ, заданный прикреплённым счёт-заказом', () => {
    const presets = [preset('p1', 'g1'), preset('p2', 'g2')];
    const withMain = {
      ...defaultPackageFormData(),
      estimate: {
        ...defaultPackageFormData().estimate,
        selectedPresetIds: ['p2'],
      },
    };
    const next = applyEstimatePresetIdsToAddendumSlot(
      withMain,
      0,
      ['p1'],
      presets,
      [],
      'additional',
      false,
      'g_other'
    );
    expect(next.addendumSlots[0].selectedPresetIds).toEqual([]);
    expect(next.estimateObjectGroupKey).toBe(withMain.estimateObjectGroupKey);
  });
});
