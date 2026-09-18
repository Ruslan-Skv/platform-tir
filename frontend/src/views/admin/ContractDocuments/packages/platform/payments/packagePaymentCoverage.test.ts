import { describe, expect, it } from '@jest/globals';

import { computePackagePaymentCoverage } from './packagePaymentCoverage';
import type { PackagePayableBreakdown } from './packagePaymentTotals';

function breakdown(
  mainContractRub: number | null,
  addendumTotals: Array<number | null>
): PackagePayableBreakdown {
  return {
    mainContractRub,
    addendumTotalsRub: addendumTotals.map((totalRub, i) => ({
      slotIndex1: i + 1,
      totalRub,
    })),
    grandTotalRub:
      mainContractRub == null
        ? null
        : mainContractRub + addendumTotals.reduce<number>((acc, t) => acc + (t ?? 0), 0),
  };
}

describe('computePackagePaymentCoverage', () => {
  it('окончательный расчёт одной суммой закрывает договор и положительные Д/с (перелив)', () => {
    const cov = computePackagePaymentCoverage(breakdown(100_000, [10_000]), [
      { amount: '110000', paymentType: 'FINAL' },
    ] as never);
    expect(cov.mainFullyCovered).toBe(true);
    expect(cov.mainPaidPct).toBe(100);
    const ds = cov.addendums[0]!;
    expect(ds.coveredRub).toBe(10_000);
    expect(ds.paidPct).toBe(100);
    expect(ds.fullyCovered).toBe(true);
  });

  it('перелив распределяется на Д/с по порядку номеров', () => {
    const cov = computePackagePaymentCoverage(breakdown(100_000, [10_000, 5_000]), [
      { amount: '112000', paymentType: 'FINAL' },
    ] as never);
    const ds1 = cov.addendums[0]!;
    const ds2 = cov.addendums[1]!;
    expect(ds1.fullyCovered).toBe(true);
    expect(ds2.coveredRub).toBe(2_000);
    expect(ds2.fullyCovered).toBe(false);
  });

  it('отдельная оплата Д/с + расчёт по договору тоже закрывают всё', () => {
    const cov = computePackagePaymentCoverage(breakdown(100_000, [10_000]), [
      { amount: '10000', paymentType: 'AMENDMENT', addendumNumber: 1 },
      { amount: '100000', paymentType: 'FINAL' },
    ] as never);
    expect(cov.mainFullyCovered).toBe(true);
    expect(cov.addendums[0]!.fullyCovered).toBe(true);
  });

  it('отрицательный Д/с уменьшает сумму договора и не требует оплаты', () => {
    const cov = computePackagePaymentCoverage(breakdown(48_520, [-1_000]), [
      { amount: '47520', paymentType: 'FINAL' },
    ] as never);
    expect(cov.effectiveMainRub).toBe(47_520);
    expect(cov.mainFullyCovered).toBe(true);
    expect(cov.mainPaidPct).toBe(100);
    const ds = cov.addendums[0]!;
    expect(ds.reducesContract).toBe(true);
    expect(ds.fullyCovered).toBe(true);
    expect(cov.journalTotalRub).toBe(47_520);
  });

  it('возврат уменьшает оплаченное по договору', () => {
    const cov = computePackagePaymentCoverage(breakdown(100_000, []), [
      { amount: '100000', paymentType: 'FINAL' },
      { amount: '30000', paymentType: 'REFUND' },
    ] as never);
    expect(cov.contractPaidRub).toBe(70_000);
    expect(cov.mainFullyCovered).toBe(false);
    expect(cov.mainRemainderRub).toBe(30_000);
  });

  it('Д/с с неизвестным итогом не считается оплаченным', () => {
    const cov = computePackagePaymentCoverage(breakdown(100_000, [null]), [
      { amount: '100000', paymentType: 'FINAL' },
    ] as never);
    expect(cov.addendums[0]!.fullyCovered).toBe(false);
    expect(cov.addendums[0]!.payableRub).toBeNull();
  });
});
