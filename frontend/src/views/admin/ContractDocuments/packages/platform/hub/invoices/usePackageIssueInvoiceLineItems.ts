'use client';

import { useCallback, useMemo, useState } from 'react';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import type { PackageFormData } from '../../form/packageForm';
import { formatPackageHubConductAmountInput } from '../../payments/packageHubConductPayment';
import {
  type PackageInvoiceEstimateSourceId,
  paymentInvoiceLinesFromEstimateSource,
} from '../../payments/packageInvoiceLinesFromEstimate';
import {
  type PaymentInvoiceLineItem,
  type PaymentInvoiceLineKind,
  emptyPaymentInvoiceLineItem,
  formatPaymentInvoiceLineAmount,
  groupPaymentInvoiceLinesForDisplay,
  sumPaymentInvoiceLineItems,
} from '../../payments/packagePaymentInvoiceLineItems';
import { recalcLineFromPriceQty } from './packageIssueInvoicePanelUtils';

export function usePackageIssueInvoiceLineItems({
  form,
  packageKind,
  isProductDirectionPackage,
  onError,
}: {
  form: PackageFormData;
  packageKind: ContractDocumentPackageKind;
  isProductDirectionPackage: boolean;
  onError: (message: string) => void;
}) {
  const [lineItems, setLineItems] = useState<PaymentInvoiceLineItem[]>(() => [
    emptyPaymentInvoiceLineItem(),
  ]);

  const linesTotalRub = useMemo(() => sumPaymentInvoiceLineItems(lineItems), [lineItems]);
  const lineDisplay = useMemo(() => groupPaymentInvoiceLinesForDisplay(lineItems), [lineItems]);
  const amountDisplay = useMemo(
    () => (linesTotalRub > 0 ? formatPackageHubConductAmountInput(linesTotalRub) : ''),
    [linesTotalRub]
  );

  const resetLineItems = useCallback(() => {
    setLineItems([emptyPaymentInvoiceLineItem()]);
  }, []);

  const prefillFirstLine = useCallback((suggested: number) => {
    const unit = formatPaymentInvoiceLineAmount(suggested);
    setLineItems([
      {
        ...emptyPaymentInvoiceLineItem('SERVICE'),
        name: 'Оплата по договору',
        unitPrice: unit,
        amount: unit,
      },
    ]);
  }, []);

  const updateLine = useCallback((index: number, patch: Partial<PaymentInvoiceLineItem>) => {
    setLineItems((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        const next = { ...line, ...patch };
        if ('quantity' in patch || 'unitPrice' in patch) {
          return recalcLineFromPriceQty(next);
        }
        return next;
      })
    );
  }, []);

  const addLine = useCallback((lineKind: PaymentInvoiceLineKind = 'SERVICE') => {
    setLineItems((prev) => [...prev, emptyPaymentInvoiceLineItem(lineKind)]);
  }, []);

  const resetAllLines = useCallback(() => {
    setLineItems([emptyPaymentInvoiceLineItem()]);
  }, []);

  const removeLine = useCallback((index: number) => {
    setLineItems((prev) => {
      if (prev.length <= 1) return [emptyPaymentInvoiceLineItem()];
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const loadLinesFromEstimate = useCallback(
    (estimateLoadSource: PackageInvoiceEstimateSourceId | '') => {
      if (!estimateLoadSource) {
        onError(
          isProductDirectionPackage
            ? 'Выберите счёт-заказ или доп. соглашение'
            : 'Выберите смету или доп. соглашение'
        );
        return;
      }
      const loaded = paymentInvoiceLinesFromEstimateSource(form, estimateLoadSource, packageKind);
      if (loaded.length === 0) {
        onError('В выбранном документе нет позиций для загрузки');
        return;
      }
      setLineItems(loaded);
    },
    [form, isProductDirectionPackage, onError, packageKind]
  );

  return {
    lineItems,
    lineDisplay,
    amountDisplay,
    linesTotalRub,
    resetLineItems,
    prefillFirstLine,
    updateLine,
    addLine,
    resetAllLines,
    removeLine,
    loadLinesFromEstimate,
  };
}
