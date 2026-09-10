'use client';

import { useMemo } from 'react';

import {
  type ContractDocumentPackageKind,
  type ContractDocumentPackagePayment,
} from '@/shared/api/admin-contract-document-packages';

import { isProductDirectionPackageKind } from '../../../config/productDirectionPackageKind';
import { computeProductContractCostBreakdown } from '../../../families/product-like/cost/productContractCostBreakdown';
import { parsePackageContractDiscountPercent } from '../../form/packageContractDiscount';
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
  const paymentsContractDiscountPct = useMemo(
    () => parsePackageContractDiscountPercent(form.contract.discountPercent),
    [form.contract.discountPercent]
  );

  const payableBreakdown = useMemo(
    () => computePackagePayableBreakdown(form, packageKind),
    [form, packageKind]
  );

  // Стоимость Д/с берём из сводки к оплате: она учитывает и прикреплённые расчёты,
  // и вручную заполненные блоки (например, «Изменения в Спецификации»).
  const addendumPaymentSummaries = useMemo(() => {
    const count = clampPackageAddendumSlotCount(form.addendumSlotCount);
    return Array.from({ length: count }, (_, i) => {
      const totalRub =
        payableBreakdown.addendumTotalsRub.find((a) => a.slotIndex1 === i + 1)?.totalRub ?? null;
      if (totalRub == null || !Number.isFinite(totalRub)) {
        return { num: i + 1, costStr: '', rec100: '', hasData: false as const };
      }
      const costStr = totalRub.toFixed(2).replace('.', ',');
      return {
        num: i + 1,
        costStr,
        // «Рекомендованная оплата» имеет смысл только когда по д/с есть что доплатить.
        rec100: totalRub > 0 ? costStr : '',
        hasData: true as const,
      };
    });
  }, [form.addendumSlotCount, payableBreakdown]);

  const windowsCostBreakdown = useMemo(
    () =>
      isProductDirectionPackageKind(packageKind) ? computeProductContractCostBreakdown(form) : null,
    [packageKind, form]
  );

  const hubFixedBasisOptions = useMemo(
    () => buildPackagePaymentBasisOptions(form, rows, payableBreakdown, packageKind),
    [form, rows, payableBreakdown, packageKind]
  );

  return {
    addendumPaymentSummaries,
    paymentsContractDiscountPct,
    payableBreakdown,
    windowsCostBreakdown,
    hubFixedBasisOptions,
  };
}
