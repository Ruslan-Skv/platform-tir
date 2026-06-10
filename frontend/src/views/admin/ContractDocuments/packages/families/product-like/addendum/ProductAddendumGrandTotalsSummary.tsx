'use client';

import { useMemo } from 'react';

import cdProduct from '../../../../styles/product-package.module.css';
import type { PackageAddendumSlotEstimateBlock } from '../../../platform/form/packageForm';
import {
  computeWindowsAddendumTotals,
  formatWindowsAddendumSignedMoney,
  windowsAddendumSlotHasAnyPrintContent,
} from './addendumSpecification';

type Props = {
  slot: PackageAddendumSlotEstimateBlock;
  contractDiscountPercent: string;
};

export function ProductAddendumGrandTotalsSummary({ slot, contractDiscountPercent }: Props) {
  const breakdown = useMemo(
    () =>
      computeWindowsAddendumTotals({
        slot,
        accountAdditionalTotal: slot.snapshot?.total ?? 0,
        accountExcludedTotal: slot.excludedSnapshot?.total ?? 0,
        contractDiscountPercent,
      }),
    [slot, contractDiscountPercent]
  );

  if (!windowsAddendumSlotHasAnyPrintContent(slot)) return null;

  return (
    <section className={cdProduct.windowsAddendumGrandTotalsCard}>
      <p className={cdProduct.windowsAddendumGrandTotalsFinal}>
        Итого по дополнительному соглашению:{' '}
        {formatWindowsAddendumSignedMoney(breakdown.grandTotal)} руб.
      </p>
    </section>
  );
}
