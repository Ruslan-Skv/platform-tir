import { defaultPackageFormData } from '../form/defaults';
import type { PackageFormData } from '../form/types';
import { computePackagePayableBreakdown } from './packagePaymentTotals';

function repairFormWithSlots(
  slots: Partial<PackageFormData['addendumSlots'][number]>[],
  contract?: Partial<PackageFormData['contract']>
): PackageFormData {
  const base = defaultPackageFormData();
  const fullSlots = base.addendumSlots.map((slot, i) => ({
    ...slot,
    ...slots[i],
  })) as PackageFormData['addendumSlots'];
  return {
    ...base,
    contract: { ...base.contract, ...contract },
    estimate: { ...base.estimate, snapshot: { total: 100000, rooms: [] } },
    addendumSlotCount: slots.length,
    addendumSlots: fullSlots,
  };
}

describe('computePackagePayableBreakdown (ремонт): скидка Д/с', () => {
  it('без своей скидки Д/с наследует договоровую', () => {
    const form = repairFormWithSlots([{ snapshot: { total: 20000, rooms: [] } }], {
      discountPercent: '10',
      totalAmount: '90 000',
    });
    const breakdown = computePackagePayableBreakdown(form, 'REPAIR');
    expect(breakdown.addendumTotalsRub[0]?.totalRub).toBe(18000);
    expect(breakdown.grandTotalRub).toBe(108000);
  });

  it('своя скидка Д/с в % замещает договоровую', () => {
    const form = repairFormWithSlots(
      [{ snapshot: { total: 20000, rooms: [] }, discountType: 'PERCENT', discountPercent: '25' }],
      { discountPercent: '10', totalAmount: '90 000' }
    );
    const breakdown = computePackagePayableBreakdown(form, 'REPAIR');
    expect(breakdown.addendumTotalsRub[0]?.totalRub).toBe(15000);
  });

  it('своя скидка Д/с в рублях пересчитывается от итога работ Д/с', () => {
    const form = repairFormWithSlots(
      [
        {
          snapshot: { total: 40000, rooms: [] },
          discountType: 'AMOUNT',
          discountAmount: '10 000',
          discountPercent: '25',
        },
      ],
      { discountPercent: '10', totalAmount: '90 000' }
    );
    const breakdown = computePackagePayableBreakdown(form, 'REPAIR');
    // 10 000 от 40 000 → 25% → 30 000
    expect(breakdown.addendumTotalsRub[0]?.totalRub).toBe(30000);
  });

  it('наследование и своя скидка соседних Д/с считаются независимо', () => {
    const form = repairFormWithSlots(
      [
        { snapshot: { total: 20000, rooms: [] } },
        {
          snapshot: { total: 20000, rooms: [] },
          discountType: 'PERCENT',
          discountPercent: '50',
        },
      ],
      { discountPercent: '10', totalAmount: '90 000' }
    );
    const breakdown = computePackagePayableBreakdown(form, 'REPAIR');
    expect(breakdown.addendumTotalsRub[0]?.totalRub).toBe(18000);
    expect(breakdown.addendumTotalsRub[1]?.totalRub).toBe(10000);
    expect(breakdown.grandTotalRub).toBe(118000);
  });
});

describe('computePackagePayableBreakdown (ремонт): непроводимые работы Д/с', () => {
  it('непроводимые вычитаются из стоимости Д/с (как «Итого по смете» в печати Д/с)', () => {
    // Кейс из прод-договера 1931р-3: доп. работы 6220, непроводимые 3390.
    const form = repairFormWithSlots(
      [
        {
          snapshot: { total: 6220, rooms: [] },
          excludedSnapshot: { total: 3390, rooms: [] },
        },
      ],
      { totalAmount: '36 346' }
    );
    const breakdown = computePackagePayableBreakdown(form, 'REPAIR');
    expect(breakdown.addendumTotalsRub[0]?.totalRub).toBe(2830);
    expect(breakdown.grandTotalRub).toBe(39176);
  });

  it('Д/с только с непроводимыми — отрицательный итог уменьшает сумму договора', () => {
    const form = repairFormWithSlots([{ excludedSnapshot: { total: 3390, rooms: [] } }], {
      totalAmount: '36 346',
    });
    const breakdown = computePackagePayableBreakdown(form, 'REPAIR');
    expect(breakdown.addendumTotalsRub[0]?.totalRub).toBe(-3390);
    expect(breakdown.grandTotalRub).toBe(32956);
  });

  it('скидка Д/с применяется к чистому итогу (доп. работы − непроводимые)', () => {
    const form = repairFormWithSlots(
      [
        {
          snapshot: { total: 20000, rooms: [] },
          excludedSnapshot: { total: 5000, rooms: [] },
          discountType: 'PERCENT',
          discountPercent: '10',
        },
      ],
      { totalAmount: '90 000' }
    );
    const breakdown = computePackagePayableBreakdown(form, 'REPAIR');
    expect(breakdown.addendumTotalsRub[0]?.totalRub).toBe(13500);
  });

  it('пустой слот без расчётов не заполняет строку Д/с', () => {
    const form = repairFormWithSlots([{}], { totalAmount: '36 346' });
    const breakdown = computePackagePayableBreakdown(form, 'REPAIR');
    expect(breakdown.addendumTotalsRub[0]?.totalRub).toBeNull();
    expect(breakdown.grandTotalRub).toBe(36346);
  });
});
