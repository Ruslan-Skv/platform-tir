import { defaultPackageFormData } from './defaults';
import type { PackageFormData } from './types';
import { resolveWorkOrderComputedForTemplate } from './workOrderHtml';

const SNAPSHOT: NonNullable<PackageFormData['estimate']['snapshot']> = {
  total: 1000,
  rooms: [
    {
      name: 'Зал',
      total: 1000,
      lines: [
        { name: 'Полы', unit: 'м²', quantity: 10, price: 80, amount: 800 },
        { name: 'Плинтус', unit: 'м', quantity: 4, price: 50, amount: 200 },
      ],
    },
  ],
};

describe('resolveWorkOrderComputedForTemplate: скидка доводится до позиций', () => {
  it('скидка договора уменьшает сумму и цену каждой позиции и итог', () => {
    const base = defaultPackageFormData();
    const form: PackageFormData = {
      ...base,
      contract: { ...base.contract, discountPercent: '10' },
      workOrder: {
        ...base.workOrder,
        taxPercent: '0',
        markupPercent: '0',
        gradeIncreasePercent: 0,
      },
    };
    const computed = resolveWorkOrderComputedForTemplate(SNAPSHOT, form, { packageKind: 'REPAIR' });
    const floors = computed.rooms[0].lines[0];
    expect(floors.originalAmount).toBe(800);
    expect(floors.adjustedAmount).toBeCloseTo(720, 8);
    expect(floors.adjustedPrice).toBeCloseTo(72, 8);
    expect(computed.originalTotal).toBe(1000);
    expect(computed.adjustedTotal).toBeCloseTo(900, 8);
  });

  it('оверрайд скидки Д/с замещает договорскую (заказ-наряд по Д/с)', () => {
    const base = defaultPackageFormData();
    const form: PackageFormData = {
      ...base,
      contract: { ...base.contract, discountPercent: '10' },
      workOrder: {
        ...base.workOrder,
        taxPercent: '0',
        markupPercent: '0',
        gradeIncreasePercent: 0,
      },
    };
    const computed = resolveWorkOrderComputedForTemplate(SNAPSHOT, form, {
      packageKind: 'REPAIR',
      discountPercentOverride: '50',
    });
    // Каждая позиция и итог — с 50% (договорные 10% не суммируются).
    expect(computed.rooms[0].lines[0].adjustedAmount).toBeCloseTo(400, 8);
    expect(computed.rooms[0].lines[1].adjustedAmount).toBeCloseTo(100, 8);
    expect(computed.adjustedTotal).toBeCloseTo(500, 8);
  });

  it('рублёвая скидка договора: производный % применяется к позициям', () => {
    const base = defaultPackageFormData();
    const form: PackageFormData = {
      ...base,
      estimate: { ...base.estimate, snapshot: { total: 1000, rooms: [] } },
      contract: {
        ...base.contract,
        discountType: 'AMOUNT',
        discountAmount: '250',
        discountPercent: '25',
      },
      workOrder: {
        ...base.workOrder,
        taxPercent: '0',
        markupPercent: '0',
        gradeIncreasePercent: 0,
      },
    };
    const computed = resolveWorkOrderComputedForTemplate(SNAPSHOT, form, { packageKind: 'REPAIR' });
    // 250 от 1000 → 25%: 800 → 600, 200 → 150, итог 750 = 1000 − 250.
    expect(computed.rooms[0].lines[0].adjustedAmount).toBeCloseTo(600, 8);
    expect(computed.rooms[0].lines[1].adjustedAmount).toBeCloseTo(150, 8);
    expect(computed.adjustedTotal).toBeCloseTo(750, 8);
  });
});
