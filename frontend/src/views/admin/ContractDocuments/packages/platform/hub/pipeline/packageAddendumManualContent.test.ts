import { describe, expect, it } from '@jest/globals';

import { mergePackageFormData } from '../../form/packageForm';
import {
  PACKAGE_BASIS_LABEL_REFUND,
  buildPackagePaymentBasisOptions,
  packageAddendumBasisLabel,
} from '../../payments/packagePaymentBasisOptions';
import { computeProductPayableBreakdown } from '../../payments/packagePaymentTotals';
import { computePackagePaymentAllocations, getUnsignedAddendumOrdinals } from './packagePipeline';

/** Д/с без прикреплённых расчётов, но с вручную заполненной спецификацией. */
const specOnlyLine = {
  id: 'line-1',
  name: 'Подоконник',
  quantity: '1',
  unit: 'шт.',
  price: '5 000',
  amount: '5 000',
};

const baseForm = () =>
  mergePackageFormData({
    contract: { totalAmount: '100 000', discountPercent: '', workPeriod: '50' },
    productSpecificationAmount: '40 000',
    estimate: { snapshot: { total: 60_000 } },
  });

const formWithSpecOnlyAddendum = () => {
  const base = baseForm();
  return mergePackageFormData({
    ...base,
    addendumSlotCount: 1,
    addendumSlots: [
      {
        status: 'OPEN',
        specificationAddedLines: [specOnlyLine],
      },
      ...base.addendumSlots.slice(1),
    ],
  });
};

describe('Д/с с ручным заполнением (без прикреплённых расчётов)', () => {
  it('считается заполненным и попадает в неподписанные', () => {
    const ordinals = getUnsignedAddendumOrdinals(formWithSpecOnlyAddendum(), 'CONTRACT_CONCLUDED');
    expect(ordinals).toEqual([1]);
  });

  it('учитывает примечания к Д/с как содержимое', () => {
    const base = baseForm();
    const form = mergePackageFormData({
      ...base,
      addendumSlotCount: 1,
      addendumSlots: [
        { status: 'OPEN', notes: '  увеличение срока  ' },
        ...base.addendumSlots.slice(1),
      ],
    });
    expect(getUnsignedAddendumOrdinals(form, 'CONTRACT_CONCLUDED')).toEqual([1]);
  });

  it('итог Д/с по «Окна» считается по строкам спецификации', () => {
    const breakdown = computeProductPayableBreakdown(formWithSpecOnlyAddendum());
    expect(breakdown.addendumTotalsRub[0]).toEqual({ slotIndex1: 1, totalRub: 5000 });
  });

  it('добавляет пункт «оплата по д/с 1» в основания оплат', () => {
    const form = formWithSpecOnlyAddendum();
    const breakdown = computeProductPayableBreakdown(form);
    const options = buildPackagePaymentBasisOptions(form, [], breakdown, 'WINDOWS');
    const full = options.find((o) => o.key === 'addendum_1');
    expect(full).toBeDefined();
    expect(full?.label).toBe(packageAddendumBasisLabel(1));
    expect(full?.disabled).toBe(false);
  });

  it('показывает в сводке д/с-уменьшение (отрицательный итог), без пункта полной оплаты', () => {
    const base = baseForm();
    const form = mergePackageFormData({
      ...base,
      addendumSlotCount: 1,
      addendumSlots: [
        {
          status: 'SIGNED',
          specificationAddedLines: [specOnlyLine],
          specificationExcludedLines: [
            {
              id: 'line-2',
              name: 'Исключение',
              quantity: '7',
              unit: 'шт.',
              price: '800',
              amount: '5 600,00',
            },
          ],
        },
        ...base.addendumSlots.slice(1),
      ],
    });
    const breakdown = computeProductPayableBreakdown(form);
    // 5 000 − 5 600 = −600: строка в сводке есть, но оплачивать по нему нечего.
    expect(breakdown.addendumTotalsRub[0]).toEqual({ slotIndex1: 1, totalRub: -600 });
    const options = buildPackagePaymentBasisOptions(form, [], breakdown, 'WINDOWS');
    expect(options.find((o) => o.key === 'addendum_1')).toBeUndefined();
    expect(options.find((o) => o.key === 'addendum_partial_1')).toBeDefined();
  });
});

describe('Возврат денежных средств клиенту', () => {
  const refundRow = {
    amount: '5000',
    paymentDate: '2026-09-10',
    paymentType: 'REFUND',
    basis: PACKAGE_BASIS_LABEL_REFUND,
  } as never;

  it('появляется в основаниях и всегда доступен', () => {
    const form = baseForm();
    const options = buildPackagePaymentBasisOptions(
      form,
      [refundRow],
      { mainContractRub: 100000, addendumTotalsRub: [], grandTotalRub: 100000 },
      'REPAIR'
    );
    const refund = options.find((o) => o.key === 'contract_refund');
    expect(refund).toBeDefined();
    expect(refund?.label).toBe(PACKAGE_BASIS_LABEL_REFUND);
    expect(refund?.disabled).toBe(false);
  });

  it('вычитается из оплаченного по договору', () => {
    const rows = [
      {
        amount: '70000',
        paymentDate: '2026-09-01',
        paymentType: 'PREPAYMENT',
        basis: 'предоплата',
      },
      refundRow,
    ] as never;
    const alloc = computePackagePaymentAllocations(rows);
    expect(alloc.contractPaidRub).toBe(65000);
  });
});
