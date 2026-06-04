'use client';

import { useMemo } from 'react';

import styles from '../ContractDocuments.module.css';
import type { RepairAddendumSlotEstimateBlock } from './repairPackageForm';
import {
  computeWindowsAddendumTotals,
  formatWindowsAddendumSignedMoney,
  windowsAddendumSlotHasAnyPrintContent,
} from './windowsAddendumSpecification';

type Props = {
  slot: RepairAddendumSlotEstimateBlock;
  contractDiscountPercent: string;
};

export function WindowsAddendumGrandTotalsSummary({ slot, contractDiscountPercent }: Props) {
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
    <section className={styles.windowsAddendumGrandTotalsCard}>
      <p className={styles.windowsAddendumGrandTotalsFinal}>
        Итого по дополнительному соглашению:{' '}
        {formatWindowsAddendumSignedMoney(breakdown.grandTotal)} руб.
      </p>
    </section>
  );
}
