import { describe, expect, it } from '@jest/globals';

import { computePackageHubConductSuggestedAmountRub } from './packageHubConductPayment';
import {
  PACKAGE_BASIS_LABEL_FULL,
  buildPackagePaymentBasisOptions,
} from './packagePaymentBasisOptions';
import { inferPaymentTypeFromBasisText } from './packagePaymentBasisOptionsStorage';

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
