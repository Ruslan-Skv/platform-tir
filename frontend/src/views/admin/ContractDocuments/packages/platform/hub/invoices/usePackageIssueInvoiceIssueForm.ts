'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { peekNextPaymentInvoiceNumber } from '@/shared/api/admin-payment-invoices';
import type { ContractDocumentPaymentInvoice } from '@/shared/api/admin-payment-invoices';

import { computePackageHubConductSuggestedAmountRub } from '../../payments/packageHubConductPayment';
import {
  type PackageInvoiceEstimateSourceId,
  packageInvoiceEstimateSourceFromBasisKey,
} from '../../payments/packageInvoiceLinesFromEstimate';
import { formatPackageIssuedInvoiceAmountRub } from '../../payments/packageInvoiceNumber';
import {
  type PackageInvoiceConductDraft,
  lineItemsForPaymentInvoiceReprint,
} from '../../payments/packageInvoicePrint';
import {
  type PackagePaymentBasisOption,
  type PackagePaymentBasisOptionKey,
} from '../../payments/packagePaymentBasisOptions';
import {
  type PaymentInvoiceLineItem,
  formatPaymentInvoiceLineAmount,
  normalizePaymentInvoiceLineItem,
  parsePaymentInvoiceLineAmount,
  sumPaymentInvoiceLineItems,
} from '../../payments/packagePaymentInvoiceLineItems';
import { type PackagePayableBreakdown } from '../../payments/packagePaymentTotals';
import type { PackageIssueInvoicePanelProps } from './PackageIssueInvoicePanel';

type PaidAllocations = {
  contractPaidRub: number;
  byAddendum: Map<number, number>;
};

export function usePackageIssueInvoiceIssueForm({
  packageId,
  onError,
  onIssue,
  onPrint,
  onDownload,
  selectedBasis,
  basisKey,
  setBasisKey,
  lineItems,
  resetLineItems,
  prefillFirstLine,
  estimateSourceOptions,
  payableBreakdown,
  journalPaidRub,
  paidAllocations,
}: {
  packageId: string;
  onError: PackageIssueInvoicePanelProps['onError'];
  onIssue: PackageIssueInvoicePanelProps['onIssue'];
  onPrint: PackageIssueInvoicePanelProps['onPrint'];
  onDownload?: PackageIssueInvoicePanelProps['onDownload'];
  selectedBasis: PackagePaymentBasisOption | undefined;
  basisKey: PackagePaymentBasisOptionKey | '';
  setBasisKey: (key: PackagePaymentBasisOptionKey | '') => void;
  lineItems: PaymentInvoiceLineItem[];
  linesTotalRub: number;
  resetLineItems: () => void;
  prefillFirstLine: (suggested: number) => void;
  estimateSourceOptions: Array<{ id: PackageInvoiceEstimateSourceId; disabled?: boolean }>;
  payableBreakdown: PackagePayableBreakdown;
  journalPaidRub: number;
  paidAllocations: PaidAllocations;
}) {
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [estimateLoadSource, setEstimateLoadSource] = useState<PackageInvoiceEstimateSourceId | ''>(
    ''
  );
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [issuedNotice, setIssuedNotice] = useState(false);
  const prefillBasisRef = useRef<PackagePaymentBasisOptionKey | ''>('');

  const refreshNextNumber = useCallback(async () => {
    try {
      const { nextNumber } = await peekNextPaymentInvoiceNumber();
      setInvoiceNumber(nextNumber);
    } catch {
      /* оставляем текущее значение */
    }
  }, []);

  useEffect(() => {
    void refreshNextNumber();
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setBasisKey('');
    resetLineItems();
    setEstimateLoadSource('');
    setIssuedNotice(false);
    prefillBasisRef.current = '';
  }, [packageId, refreshNextNumber, resetLineItems, setBasisKey]);

  useEffect(() => {
    if (!basisKey) return;
    const suggested = packageInvoiceEstimateSourceFromBasisKey(basisKey);
    if (!suggested) return;
    const opt = estimateSourceOptions.find((o) => o.id === suggested);
    if (opt && !opt.disabled) setEstimateLoadSource(suggested);
  }, [basisKey, estimateSourceOptions]);

  useEffect(() => {
    if (!selectedBasis || selectedBasis.disabled) return;
    if (prefillBasisRef.current === basisKey) return;
    prefillBasisRef.current = basisKey;

    const suggested = computePackageHubConductSuggestedAmountRub(
      selectedBasis,
      payableBreakdown,
      journalPaidRub,
      paidAllocations.contractPaidRub,
      paidAllocations.byAddendum
    );

    if (
      suggested != null &&
      suggested > 0 &&
      lineItems.length === 1 &&
      !lineItems[0]?.name.trim()
    ) {
      prefillFirstLine(suggested);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- только при смене основания
  }, [selectedBasis, basisKey, payableBreakdown, journalPaidRub, paidAllocations]);

  const buildConductDraft = useCallback((): PackageInvoiceConductDraft | null => {
    const num = invoiceNumber.trim();
    const basis = selectedBasis?.label.trim();

    if (!num) {
      onError('Укажите номер счёта');
      return null;
    }

    if (!basis || !selectedBasis || selectedBasis.disabled) {
      onError('Выберите основание платежа');
      return null;
    }

    const normalizedLines = lineItems
      .map((line) => normalizePaymentInvoiceLineItem(line))
      .filter((line) => line.name && parsePaymentInvoiceLineAmount(line.amount));

    if (normalizedLines.length === 0) {
      onError('Добавьте хотя бы одну позицию (товар или услугу) в таблицу');
      return null;
    }

    const totalRub = sumPaymentInvoiceLineItems(normalizedLines);
    if (totalRub <= 0) {
      onError('Укажите суммы по позициям счёта');
      return null;
    }

    return {
      invoiceDate,
      invoiceNumber: num,
      paymentBasis: basis,
      amount: formatPaymentInvoiceLineAmount(totalRub),
      lineItems: normalizedLines,
    };
  }, [invoiceDate, invoiceNumber, lineItems, onError, selectedBasis]);

  const handleDownload = useCallback(
    async (conduct: PackageInvoiceConductDraft) => {
      if (!onDownload) return;
      setDownloadBusy(true);
      try {
        await onDownload(conduct);
      } finally {
        setDownloadBusy(false);
      }
    },
    [onDownload]
  );

  const formComplete =
    invoiceNumber.trim().length > 0 &&
    Boolean(selectedBasis && !selectedBasis.disabled) &&
    lineItems.some(
      (line) => line.name.trim() && (parsePaymentInvoiceLineAmount(line.amount) ?? 0) > 0
    );

  const handleIssue = useCallback(async () => {
    const conduct = buildConductDraft();
    if (!conduct || !selectedBasis) return;

    setIssuedNotice(false);
    await onIssue(conduct, selectedBasis);
    setIssuedNotice(true);
    setBasisKey('');
    resetLineItems();
    setEstimateLoadSource('');
    prefillBasisRef.current = '';
    await refreshNextNumber();
  }, [buildConductDraft, onIssue, refreshNextNumber, resetLineItems, selectedBasis, setBasisKey]);

  const handlePrint = useCallback(() => {
    const conduct = buildConductDraft();
    if (conduct) onPrint(conduct);
  }, [buildConductDraft, onPrint]);

  const handleDownloadDraft = useCallback(() => {
    const conduct = buildConductDraft();
    if (conduct) void handleDownload(conduct);
  }, [buildConductDraft, handleDownload]);

  const handleReprintDownload = useCallback(
    (row: ContractDocumentPaymentInvoice) => {
      void handleDownload({
        invoiceDate: row.invoiceDate,
        invoiceNumber: row.invoiceNumber,
        paymentBasis: row.basis,
        amount: formatPackageIssuedInvoiceAmountRub(Number(row.amount)),
        lineItems: lineItemsForPaymentInvoiceReprint(row),
      });
    },
    [handleDownload]
  );

  return {
    invoiceDate,
    setInvoiceDate,
    invoiceNumber,
    setInvoiceNumber,
    estimateLoadSource,
    setEstimateLoadSource,
    issuedNotice,
    downloadBusy,
    formComplete,
    handleIssue,
    handlePrint,
    handleDownloadDraft,
    handleReprintDownload,
  };
}
