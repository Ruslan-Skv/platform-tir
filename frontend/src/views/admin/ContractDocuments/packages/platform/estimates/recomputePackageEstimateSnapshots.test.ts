import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import { defaultPackageFormData } from '../form/defaults';
import {
  applyEstimatePresetIdsToAddendumSlot,
  applyEstimatePresetIdsToPackageForm,
  recomputePackageEstimateSnapshots,
} from './applyEstimatePresetIds';

function preset(
  id: string,
  total: number,
  additionalMarkupPercent?: number
): ContractEstimatePreset {
  return {
    id,
    title: `Расчёт ${id}`,
    categoryName: 'Ремонт',
    groupId: 'g1',
    ...(additionalMarkupPercent !== undefined ? { additionalMarkupPercent } : {}),
    snapshot: {
      total,
      rooms: [
        {
          name: 'Помещение',
          total,
          lines: [{ name: 'Работа', unit: 'шт.', quantity: 1, price: total, amount: total }],
        },
      ],
    },
  } as unknown as ContractEstimatePreset;
}

describe('recomputePackageEstimateSnapshots (смена наценки расчёта в пакете)', () => {
  it('пересчитывает осн. смету и суммы договора по новой наценке', () => {
    const base = defaultPackageFormData();
    const withEstimate = applyEstimatePresetIdsToPackageForm(base, ['p1'], [preset('p1', 1000)]);
    expect(withEstimate.estimate.snapshot?.total).toBe(1000);

    const next = recomputePackageEstimateSnapshots(
      withEstimate,
      ['p1'],
      [preset('p1', 1000, 10)],
      []
    );
    // +10% к каждой позиции — итог вырос, договор тоже.
    expect(next.estimate.snapshot?.total).toBe(1100);
    expect(next.estimate.snapshot?.rooms[0].lines[0].price).toBe(1100);
    expect(Number(next.contract.totalAmount)).toBe(1100);
  });

  it('не трогает пакет, если изменённый расчёт в нём не используется', () => {
    const withEstimate = applyEstimatePresetIdsToPackageForm(
      defaultPackageFormData(),
      ['p1'],
      [preset('p1', 1000)]
    );
    const next = recomputePackageEstimateSnapshots(
      withEstimate,
      ['other'],
      [preset('p1', 1000, 10)],
      []
    );
    expect(next).toBe(withEstimate);
  });

  it('пересчитывает слот Д/с с изменённым расчётом (в т.ч. исключённые работы)', () => {
    const base = defaultPackageFormData();
    const withMain = applyEstimatePresetIdsToPackageForm(
      base,
      ['p1'],
      [preset('p1', 1000), preset('p2', 500)]
    );
    const withAddendum = applyEstimatePresetIdsToAddendumSlot(
      withMain,
      0,
      ['p2'],
      [preset('p1', 1000), preset('p2', 500)]
    );

    const next = recomputePackageEstimateSnapshots(
      withAddendum,
      ['p2'],
      [preset('p1', 1000), preset('p2', 500, 20)],
      []
    );
    expect(next.addendumSlots[0].snapshot?.total).toBe(600);
    // Осн. смета не затронута — p1 не менялся.
    expect(next.estimate.snapshot?.total).toBe(1000);
  });

  it('подписанное Д/с не пересчитывается (снимок сохраняется как подписан)', () => {
    const base = defaultPackageFormData();
    const presets = [preset('p1', 1000), preset('p2', 500)];
    const withMain = applyEstimatePresetIdsToPackageForm(base, ['p1'], presets);
    const withAddendum = applyEstimatePresetIdsToAddendumSlot(withMain, 0, ['p2'], presets);
    const signed = {
      ...withAddendum,
      addendumSlots: withAddendum.addendumSlots.map((slot, i) =>
        i === 0 ? { ...slot, status: 'SIGNED' as const } : slot
      ),
    };

    const next = recomputePackageEstimateSnapshots(
      signed,
      ['p2'],
      [preset('p1', 1000), preset('p2', 500, 20)],
      []
    );
    expect(next.addendumSlots[0].snapshot?.total).toBe(500);
  });

  it('наценка объекта применяется при пересчёте, если у расчёта своей нет', () => {
    const groups: ContractEstimateGroup[] = [
      { id: 'g1', title: 'Объект', additionalMarkupPercent: 15 },
    ];
    const withEstimate = applyEstimatePresetIdsToPackageForm(
      defaultPackageFormData(),
      ['p1'],
      [preset('p1', 1000)],
      groups
    );
    // Прикрепление уже применило наценку объекта.
    expect(withEstimate.estimate.snapshot?.total).toBe(1150);

    // Появилась своя наценка расчёта — она важнее наценки объекта.
    const next = recomputePackageEstimateSnapshots(
      withEstimate,
      ['p1'],
      [preset('p1', 1000, 5)],
      groups
    );
    expect(next.estimate.snapshot?.total).toBe(1050);
  });
});
