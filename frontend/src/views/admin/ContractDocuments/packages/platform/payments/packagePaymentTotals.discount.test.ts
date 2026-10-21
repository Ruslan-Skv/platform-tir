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
