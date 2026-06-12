'use client';

import { useMemo } from 'react';

import {
  type ContractDocumentPackageKind,
  type ContractDocumentPackagePayment,
} from '@/shared/api/admin-contract-document-packages';

import { isProductDirectionPackageKind } from '../../../config/productDirectionPackageKind';
import { computeProductContractCostBreakdown } from '../../../families/product-like/cost/productContractCostBreakdown';
import {
  applyPackageContractDiscountToAmount,
  parsePackageContractDiscountPercent,
} from '../../form/packageContractDiscount';
import { type PackageFormData, clampPackageAddendumSlotCount } from '../../form/packageForm';
import { buildPackagePaymentBasisOptions } from '../../payments/packagePaymentBasisOptions';
import { computePackagePayableBreakdown } from '../../payments/packagePaymentTotals';

export type UsePackagePaymentsSummaryBreakdownParams = {
  form: PackageFormData;
  packageKind: ContractDocumentPackageKind;
  rows: ContractDocumentPackagePayment[];
};

export function usePackagePaymentsSummaryBreakdown({
  form,
  packageKind,
  rows,
}: UsePackagePaymentsSummaryBreakdownParams) {
  const addendumPaymentSummaries = useMemo(() => {
    const discountPct = parsePackageContractDiscountPercent(form.contract.discountPercent);
    const count = clampPackageAddendumSlotCount(form.addendumSlotCount);
    return Array.from({ length: count }, (_, i) => {
      const raw = form.addendumSlots[i]?.snapshot?.total;
      if (typeof raw !== 'number' || !Number.isFinite(raw)) {
        return { num: i + 1, costStr: '', rec100: '', hasData: false as const };
      }
      const total = applyPackageContractDiscountToAmount(raw, discountPct);
      const costStr = total.toFixed(2).replace('.', ',');
      return {
        num: i + 1,
        costStr,
        rec100: costStr,
        hasData: true as const,
      };
    });
  }, [form.addendumSlotCount, form.addendumSlots, form.contract.discountPercent]);

  const paymentsContractDiscountPct = useMemo(
    () => parsePackageContractDiscountPercent(form.contract.discountPercent),
    [form.contract.discountPercent]
  );

  const payableBreakdown = useMemo(
    () => computePackagePayableBreakdown(form, packageKind),
    [form, packageKind]
  );

  const windowsCostBreakdown = useMemo(
    () =>
      isProductDirectionPackageKind(packageKind) ? computeProductContractCostBreakdown(form) : null,
    [packageKind, form]
  );

  const hubFixedBasisOptions = useMemo(
    () => buildPackagePaymentBasisOptions(form, rows, payableBreakdown),
    [form, rows, payableBreakdown]
  );

  return {
    addendumPaymentSummaries,
    paymentsContractDiscountPct,
    payableBreakdown,
    windowsCostBreakdown,
    hubFixedBasisOptions,
  };
}
