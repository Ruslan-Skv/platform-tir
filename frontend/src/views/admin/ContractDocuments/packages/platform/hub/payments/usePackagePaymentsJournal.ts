'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type ContractDocumentPackagePayment,
  getContractDocumentPackagePayments,
} from '@/shared/api/admin-contract-document-packages';

import { resolveFurniturePaymentLeg } from '../../../directions/furniture/furniturePaymentLeg';
import { type PackagePayableBreakdown } from '../../payments/packagePaymentTotals';
import { formatPercentOfGrandTotal } from './packageContractPaymentsFormat';

export type UsePackagePaymentsJournalParams = {
  packageId: string;
  onError: (message: string) => void;
  journalReloadToken?: number;
  payableBreakdown: PackagePayableBreakdown;
};

export function usePackagePaymentsJournal({
  packageId,
  onError,
  journalReloadToken = 0,
  payableBreakdown,
}: UsePackagePaymentsJournalParams) {
  const [rows, setRows] = useState<ContractDocumentPackagePayment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getContractDocumentPackagePayments(packageId);
      setRows(list);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не удалось загрузить оплаты');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [packageId, onError]);

  useEffect(() => {
    void load();
  }, [load, journalReloadToken]);

  const paidAllocations = useMemo(() => {
    let contractPaidRub = 0;
    const byAddendum = new Map<number, number>();
    const byFurnitureLeg = new Map<string, number>();
    for (const r of rows) {
      const n = Number.parseFloat(r.amount);
      if (!Number.isFinite(n)) continue;
      // Возврат денег клиенту уменьшает оплаченную сумму.
      const signed = r.paymentType === 'REFUND' ? -n : n;
      if (r.paymentType === 'AMENDMENT' && r.addendumNumber != null && r.addendumNumber >= 1) {
        byAddendum.set(r.addendumNumber, (byAddendum.get(r.addendumNumber) ?? 0) + signed);
      } else {
        contractPaidRub += signed;
        const leg = resolveFurniturePaymentLeg(r);
        if (leg) {
          byFurnitureLeg.set(leg, (byFurnitureLeg.get(leg) ?? 0) + n);
        }
      }
    }
    return { contractPaidRub, byAddendum, byFurnitureLeg };
  }, [rows]);

  const journalPaidRub = useMemo(
    () =>
      rows.reduce((acc, r) => {
        const n = Number.parseFloat(r.amount);
        const signed = r.paymentType === 'REFUND' ? -n : n;
        return acc + (Number.isFinite(n) ? signed : 0);
      }, 0),
    [rows]
  );

  const balancePerJournalRub = useMemo(() => {
    const gt = payableBreakdown.grandTotalRub;
    if (gt == null) return null;
    return gt - journalPaidRub;
  }, [payableBreakdown.grandTotalRub, journalPaidRub]);

  const grandTotalRub = payableBreakdown.grandTotalRub;

  const journalPaidPctOfGrand = useMemo(
    () => formatPercentOfGrandTotal(journalPaidRub, grandTotalRub),
    [journalPaidRub, grandTotalRub]
  );

  const balancePctOfGrand = useMemo(
    () => formatPercentOfGrandTotal(balancePerJournalRub, grandTotalRub),
    [balancePerJournalRub, grandTotalRub]
  );

  const mainContractPctOfGrand = useMemo(
    () => formatPercentOfGrandTotal(payableBreakdown.mainContractRub, grandTotalRub),
    [payableBreakdown.mainContractRub, grandTotalRub]
  );

  return {
    rows,
    setRows,
    loading,
    load,
    paidAllocations,
    journalPaidRub,
    balancePerJournalRub,
    grandTotalRub,
    journalPaidPctOfGrand,
    balancePctOfGrand,
    mainContractPctOfGrand,
  };
}
