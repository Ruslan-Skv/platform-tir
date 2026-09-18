import { describe, expect, it } from '@jest/globals';

import { computePackageHubConductSuggestedAmountRub } from './packageHubConductPayment';
import {
  PACKAGE_BASIS_LABEL_FULL,
  buildPackagePaymentBasisOptions,
} from './packagePaymentBasisOptions';
import { inferPaymentTypeFromBasisText } from './packagePaymentBasisOptionsStorage';
import { computePackagePaymentCoverage } from './packagePaymentCoverage';

describe('полная оплата по договору', () => {
  const baseForm = {
    addendumSlotCount: 0,
    addendumSlots: [],
    contract: {
      totalAmount: '100000',
      discountPercent: '',
      prepaymentAmount: '',
      paymentBasis: '',
      recommendedPrepayment: '',
    },
    furniture: null,
  };

  it('добавляет пункт «полная оплата по договору» в список оснований', () => {
    const options = buildPackagePaymentBasisOptions(
      baseForm as never,
      [],
      { mainContractRub: 100000, addendumTotalsRub: [], grandTotalRub: 100000 },
      'REPAIR'
    );
    const full = options.find((o) => o.key === 'contract_full');
    expect(full).toBeDefined();
    expect(full?.label).toBe(PACKAGE_BASIS_LABEL_FULL);
    expect(full?.paymentType).toBe('FINAL');
    expect(full?.disabled).toBe(false);
  });

  it('выводит тип FINAL для текста «полная оплата по договору»', () => {
    expect(inferPaymentTypeFromBasisText('полная оплата по договору').paymentType).toBe('FINAL');
  });

  it('подставляет остаток по основному договору как сумму', () => {
    const option = {
      key: 'contract_full',
      label: PACKAGE_BASIS_LABEL_FULL,
      paymentType: 'FINAL',
      disabled: false,
    };
    const amount = computePackageHubConductSuggestedAmountRub(
      option as never,
      { mainContractRub: 100000, addendumTotalsRub: [], grandTotalRub: 100000 },
      0,
      30000
    );
    expect(amount).toBe(70000);
  });
});

describe('оплаты с доп. соглашениями', () => {
  const addendumForm = {
    addendumSlotCount: 1,
    addendumSlots: [
      { status: 'SIGNED', signedAt: new Date().toISOString(), snapshot: { total: 10_000 } },
    ],
    contract: {
      totalAmount: '100000',
      discountPercent: '',
      prepaymentAmount: '',
      paymentBasis: '',
      recommendedPrepayment: '',
    },
    furniture: null,
  };
  const addendumBreakdown = {
    mainContractRub: 100_000,
    addendumTotalsRub: [{ slotIndex1: 1, totalRub: 10_000 }],
    grandTotalRub: 110_000,
  };

  it('окончательный расчёт одной суммой закрывает пункты оплаты по Д/с (перелив)', () => {
    const options = buildPackagePaymentBasisOptions(
      addendumForm as never,
      [{ amount: '110000', paymentType: 'FINAL' }] as never,
      addendumBreakdown,
      'REPAIR'
    );
    const full = options.find((o) => o.key === 'addendum_1');
    const partial = options.find((o) => o.key === 'addendum_partial_1');
    expect(full?.disabled).toBe(true);
    expect(partial?.disabled).toBe(true);
  });

  it('частичная оплата по Д/с остаётся доступной, пока Д/с не закрыт', () => {
    const options = buildPackagePaymentBasisOptions(
      addendumForm as never,
      [
        { amount: '60000', paymentType: 'PREPAYMENT' },
        { amount: '40000', paymentType: 'FINAL' },
      ] as never,
      addendumBreakdown,
      'REPAIR'
    );
    expect(options.find((o) => o.key === 'addendum_1')?.disabled).toBe(false);
    expect(options.find((o) => o.key === 'addendum_partial_1')?.disabled).toBe(false);
  });

  it('подсказка суммы «оплата по д/с» — остаток с учётом перелива из договора', () => {
    const breakdownCov = computePackagePaymentCoverage(addendumBreakdown, [
      { amount: '105000', paymentType: 'FINAL' },
    ] as never);
    // Договор покрыт на 100 000, перелив 5 000 ушёл на Д/с: остаётся доплатить 5 000.
    const amount = computePackageHubConductSuggestedAmountRub(
      {
        key: 'addendum_1',
        label: 'оплата по д/с 1',
        paymentType: 'AMENDMENT',
        addendumNumber: 1,
        disabled: false,
      } as never,
      addendumBreakdown,
      105_000,
      105_000,
      undefined,
      undefined,
      breakdownCov
    );
    expect(amount).toBe(5000);
  });

  it('подсказка «полная оплата по договору» учитывает уменьшение от отрицательного Д/с', () => {
    const reducingBreakdown = {
      mainContractRub: 48_520,
      addendumTotalsRub: [{ slotIndex1: 1, totalRub: -1_000 }],
      grandTotalRub: 47_520,
    };
    const cov = computePackagePaymentCoverage(reducingBreakdown, [
      { amount: '47520', paymentType: 'FINAL' },
    ] as never);
    const amount = computePackageHubConductSuggestedAmountRub(
      {
        key: 'contract_full',
        label: PACKAGE_BASIS_LABEL_FULL,
        paymentType: 'FINAL',
        disabled: false,
      } as never,
      reducingBreakdown,
      47_520,
      47_520,
      undefined,
      undefined,
      cov
    );
    expect(amount).toBe(0);
  });
});
