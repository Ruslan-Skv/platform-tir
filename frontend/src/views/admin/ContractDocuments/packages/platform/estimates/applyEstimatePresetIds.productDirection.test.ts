import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';

import { defaultPackageFormData } from '../form/defaults';
import { applyEstimatePresetIdsToPackageForm } from './applyEstimatePresetIds';

function preset(id: string, total: number): ContractEstimatePreset {
  return {
    id,
    title: `Счёт-заказ ${id}`,
    categoryName: 'Окна',
    groupId: 'g1',
    snapshot: {
      total,
      rooms: [
        {
          name: 'Помещение',
          total,
          lines: [{ name: 'Монтаж', unit: 'шт.', quantity: 1, price: total, amount: total }],
        },
      ],
    },
  } as unknown as ContractEstimatePreset;
}

/** Продуктовый пакет (Окна): смета-работы + стоимость изделий из спецификации. */
function windowsFormWithProducts(specAmount: string): ReturnType<typeof defaultPackageFormData> {
  const base = defaultPackageFormData();
  return {
    ...base,
    productSpecificationAmount: specAmount,
    contract: {
      ...base.contract,
      discountPercent: '',
    },
  };
}

describe('applyEstimatePresetIdsToPackageForm productDirection', () => {
  it('продуктовый пакет: пересчёт сметы сохраняет изделия в итоге договора (баг ЭП 3742о-2)', () => {
    const form = windowsFormWithProducts('104636');
    const next = applyEstimatePresetIdsToPackageForm(form, ['p1'], [preset('p1', 34627)], [], {
      productDirection: true,
    });
    // Итог = изделия (104636) + монтажные работы (34627), а не только смета.
    expect(next.contract.totalAmount).toBe('139263');
    expect(next.contract.totalAmountWords).toContain('сто тридцать девять');
    expect(next.estimate.snapshot?.total).toBe(34627);
  });

  it('продуктовый пакет: снятие сметы оставляет в итоге только изделия', () => {
    const form = windowsFormWithProducts('104636');
    const next = applyEstimatePresetIdsToPackageForm(form, [], [], [], {
      productDirection: true,
    });
    expect(next.contract.totalAmount).toBe('104636');
    expect(next.estimate.snapshot).toBeNull();
  });

  it('продуктовый пакет со скидкой по договору: скидка применяется к работам, изделия как есть', () => {
    const base = windowsFormWithProducts('104636');
    const form = { ...base, contract: { ...base.contract, discountPercent: '10' } };
    const next = applyEstimatePresetIdsToPackageForm(form, ['p1'], [preset('p1', 100000)], [], {
      productDirection: true,
    });
    // Работы 100000 − 10% = 90000; 90000 + 104636 = 194636.
    expect(next.contract.totalAmount).toBe('194636');
  });

  it('непродуктовый пакет: прежнее поведение — итог только по смете', () => {
    const base = defaultPackageFormData();
    const form = { ...base, productSpecificationAmount: '104636' };
    const next = applyEstimatePresetIdsToPackageForm(form, ['p1'], [preset('p1', 34627)], []);
    expect(next.contract.totalAmount).toBe('34627');
  });
});
