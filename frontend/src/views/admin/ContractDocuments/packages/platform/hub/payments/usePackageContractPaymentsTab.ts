'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  type ManagerSubstitution,
  getActiveManagerSubstitutions,
} from '@/shared/api/accounting/admin-salary';

import { computePackagePayableBreakdown } from '../../payments/packagePaymentTotals';
import type { PackageContractPaymentsTabProps } from './PackageContractPaymentsTab';
import { usePackagePaymentsConduct } from './usePackagePaymentsConduct';
import { usePackagePaymentsJournal } from './usePackagePaymentsJournal';
import { usePackagePaymentsSummaryBreakdown } from './usePackagePaymentsSummaryBreakdown';

export function usePackageContractPaymentsTab({
  packageId,
  packageKind = 'REPAIR',
  form,
  onError,
  onUpdateContract,
  onJournalChanged,
  layout = 'full',
  journalReloadToken = 0,
  onPrintCashOrder,
  onUpdateContractFields,
}: PackageContractPaymentsTabProps) {
  const showHubSummary = layout === 'full' || layout === 'hub' || layout === 'hub-summary';
  const showJournalTable = layout === 'full' || layout === 'journal';
  const isHubSummaryLayout = layout === 'hub' || layout === 'hub-summary';
  const isHubConductLayout = layout === 'hub' || layout === 'hub-conduct';
  const showConductForm = layout === 'full' || layout === 'hub-conduct' || layout === 'hub';
  const isHubPartLayout = layout === 'hub-summary' || layout === 'hub-conduct';

  const payableBreakdown = useMemo(
    () => computePackagePayableBreakdown(form, packageKind),
    [form, packageKind]
  );

  // Подмены менеджера договора (отпуск/больничный): баннер над блоком оплат —
  // оплаты и з/п по договору в период подмены учитываются за подменяющего.
  const contractManagerId = form.executor?.signatoryCrmUserId?.trim() || '';
  const [managerSubstitutions, setManagerSubstitutions] = useState<ManagerSubstitution[]>([]);
  useEffect(() => {
    if (!contractManagerId) {
      setManagerSubstitutions([]);
      return;
    }
    let cancelled = false;
    getActiveManagerSubstitutions(contractManagerId)
      .then((rows) => {
        if (!cancelled) setManagerSubstitutions(rows);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [contractManagerId]);
  const activeManagerSubstitutions = useMemo(
    () => managerSubstitutions.filter((s) => s.status !== 'past'),
    [managerSubstitutions]
  );

  const journal = usePackagePaymentsJournal({
    packageId,
    onError,
    journalReloadToken,
    payableBreakdown,
    onJournalChanged,
  });

  const summary = usePackagePaymentsSummaryBreakdown({
    form,
    packageKind,
    rows: journal.rows,
  });

  const conduct = usePackagePaymentsConduct({
    packageId,
    form,
    onError,
    onUpdateContract,
    onJournalChanged,
    onPrintCashOrder,
    onUpdateContractFields,
    isHubConductLayout,
    setRows: journal.setRows,
    payableBreakdown: summary.payableBreakdown,
    journalPaidRub: journal.journalPaidRub,
    paidAllocations: journal.paidAllocations,
    coverage: journal.coverage,
    hubFixedBasisOptions: summary.hubFixedBasisOptions,
  });

  return {
    packageKind,
    form,
    layout,
    onUpdateContract,
    onPrintCashOrder,
    /** Активные/предстоящие подмены менеджера договора (баннер над оплатами). */
    activeManagerSubstitutions,
    rows: journal.rows,
    loading: journal.loading,
    cancelingPaymentId: journal.cancelingPaymentId,
    cancelPayment: journal.cancelPayment,
    updatingPaymentId: journal.updatingPaymentId,
    updatePayment: journal.updatePayment,
    saving: conduct.saving,
    showHubSummary,
    showJournalTable,
    isHubSummaryLayout,
    isHubConductLayout,
    showConductForm,
    isHubPartLayout,
    draft: conduct.draft,
    setDraft: conduct.setDraft,
    newBasisDraft: conduct.newBasisDraft,
    setNewBasisDraft: conduct.setNewBasisDraft,
    hubBasisKey: conduct.hubBasisKey,
    conductAmount: conduct.conductAmount,
    setConductAmount: conduct.setConductAmount,
    acceptedByUserId: conduct.acceptedByUserId,
    setAcceptedByUserId: conduct.setAcceptedByUserId,
    acceptorChoices: conduct.acceptorChoices,
    hubPaymentConductedNotice: conduct.hubPaymentConductedNotice,
    addendumPaymentSummaries: summary.addendumPaymentSummaries,
    paymentsContractDiscountPct: summary.paymentsContractDiscountPct,
    payableBreakdown: summary.payableBreakdown,
    windowsCostBreakdown: summary.windowsCostBreakdown,
    paidAllocations: journal.paidAllocations,
    coverage: journal.coverage,
    journalPaidRub: journal.journalPaidRub,
    grandTotalRub: journal.grandTotalRub,
    mainContractPctOfGrand: journal.mainContractPctOfGrand,
    journalPaidPctOfGrand: journal.journalPaidPctOfGrand,
    balancePerJournalRub: journal.balancePerJournalRub,
    balancePctOfGrand: journal.balancePctOfGrand,
    hubConductDateReady: conduct.hubConductDateReady,
    hubConductAllBasesDone: conduct.hubConductAllBasesDone,
    hubConductFormComplete: conduct.hubConductFormComplete,
    hubConductBasisReady: conduct.hubConductBasisReady,
    hubFixedBasisOptions: summary.hubFixedBasisOptions,
    handleHubBasisChange: conduct.handleHubBasisChange,
    handleHubPrintCashOrder: conduct.handleHubPrintCashOrder,
    handleAppendBasisOption: conduct.handleAppendBasisOption,
    submitHubConductPayment: conduct.submitHubConductPayment,
    submitCreate: conduct.submitCreate,
    basisSelectOptionsCreate: conduct.basisSelectOptionsCreate,
  };
}

export type PackageContractPaymentsTabModel = ReturnType<typeof usePackageContractPaymentsTab>;
