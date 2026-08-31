'use client';

import { useMemo, useState } from 'react';

import { isProductDirectionPackageKind } from '../../../config/productDirectionPackageKind';
import {
  buildPackageInvoiceEstimateSourceOptions,
  packageInvoiceContractSourceSummaryHint,
} from '../../payments/packageInvoiceLinesFromEstimate';
import {
  type PackagePaymentBasisOptionKey,
  buildPackagePaymentBasisOptions,
  packagePaymentBasisOptionByKey,
} from '../../payments/packagePaymentBasisOptions';
import { computePackagePayableBreakdown } from '../../payments/packagePaymentTotals';
import type { PackageIssueInvoicePanelProps } from './PackageIssueInvoicePanel';
import {
  computePackageIssueInvoicePaidAllocations,
  sumPackageIssueInvoiceJournalPaidRub,
} from './packageIssueInvoicePaidAllocations';
import { usePackageIssueInvoiceIssueForm } from './usePackageIssueInvoiceIssueForm';
import { usePackageIssueInvoiceLineItems } from './usePackageIssueInvoiceLineItems';

export function usePackageIssueInvoicePanel({
  packageId,
  packageKind = 'REPAIR',
  form,
  issuedRows,
  paymentRows = [],
  onError,
  onIssue,
  onPrint,
  onDownload,
  saving = false,
  showIssuedTable = true,
  onReprint,
  onShare,
}: PackageIssueInvoicePanelProps) {
  const [basisKey, setBasisKey] = useState<PackagePaymentBasisOptionKey | ''>('');

  const payableBreakdown = useMemo(
    () => computePackagePayableBreakdown(form, packageKind),
    [form, packageKind]
  );

  const isProductDirectionPackage = isProductDirectionPackageKind(packageKind);

  const paidAllocations = useMemo(
    () => computePackageIssueInvoicePaidAllocations(paymentRows),
    [paymentRows]
  );

  const journalPaidRub = useMemo(
    () => sumPackageIssueInvoiceJournalPaidRub(paymentRows),
    [paymentRows]
  );

  const basisOptions = useMemo(() => {
    const opts = buildPackagePaymentBasisOptions(form, paymentRows, payableBreakdown);
    return opts.map((opt) => ({
      ...opt,
      disabled: opt.disabled || issuedRows.some((inv) => inv.basis.trim() === opt.label.trim()),
    }));
  }, [form, paymentRows, payableBreakdown, issuedRows]);

  const selectedBasis = packagePaymentBasisOptionByKey(basisOptions, basisKey);

  const estimateSourceOptions = useMemo(
    () => buildPackageInvoiceEstimateSourceOptions(form, packageKind),
    [form, packageKind]
  );

  const contractSourceSummaryHint = useMemo(
    () => packageInvoiceContractSourceSummaryHint(form, packageKind),
    [form, packageKind]
  );

  const lineItemsModel = usePackageIssueInvoiceLineItems({
    form,
    packageKind,
    isProductDirectionPackage,
    onError,
  });

  const issueForm = usePackageIssueInvoiceIssueForm({
    packageId,
    onError,
    onIssue,
    onPrint,
    onDownload,
    selectedBasis,
    basisKey,
    setBasisKey,
    lineItems: lineItemsModel.lineItems,
    linesTotalRub: lineItemsModel.linesTotalRub,
    resetLineItems: lineItemsModel.resetLineItems,
    prefillFirstLine: lineItemsModel.prefillFirstLine,
    estimateSourceOptions,
    payableBreakdown,
    journalPaidRub,
    paidAllocations,
  });

  const { estimateLoadSource } = issueForm;
  const selectedEstimateSourceResolved = estimateSourceOptions.find(
    (o) => o.id === estimateLoadSource
  );

  return {
    packageId,
    saving,
    showIssuedTable,
    onDownload,
    onReprint,
    onShare,
    ...issueForm,
    basisKey,
    setBasisKey,
    basisOptions,
    selectedBasis,
    amountDisplay: lineItemsModel.amountDisplay,
    isProductDirectionPackage,
    contractSourceSummaryHint,
    estimateSourceOptions,
    selectedEstimateSource: selectedEstimateSourceResolved,
    lineItems: lineItemsModel.lineItems,
    lineDisplay: lineItemsModel.lineDisplay,
    updateLine: lineItemsModel.updateLine,
    addLine: lineItemsModel.addLine,
    resetAllLines: lineItemsModel.resetAllLines,
    removeLine: lineItemsModel.removeLine,
    loadLinesFromEstimate: () => lineItemsModel.loadLinesFromEstimate(issueForm.estimateLoadSource),
    issuedRows,
  };
}

export type PackageIssueInvoicePanelModel = ReturnType<typeof usePackageIssueInvoicePanel>;
