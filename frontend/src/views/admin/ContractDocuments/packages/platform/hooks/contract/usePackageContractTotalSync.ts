'use client';

import { useCallback, useEffect, useMemo } from 'react';

import { todayContractDateDdMmYyyy } from '../../../../core/contractDateFormat';
import {
  computeProductContractCostBreakdown,
  productContractTotalToContractFields,
} from '../../../families/product-like/cost/productContractCostBreakdown';
import {
  applyPackageContractDiscountToNullableBase,
  packageEstimateTotalToContractFields,
} from '../../form/packageContractDiscount';
import type { PackageFormData } from '../../form/packageForm';

export type UsePackageContractTotalSyncOptions = {
  form: PackageFormData;
  formRef: React.MutableRefObject<PackageFormData>;
  setForm: React.Dispatch<React.SetStateAction<PackageFormData>>;
  touchPackageData: () => void;
  isProductDirectionPackage: boolean;
};

export function usePackageContractTotalSync({
  form,
  formRef,
  setForm,
  touchPackageData,
  isProductDirectionPackage,
}: UsePackageContractTotalSyncOptions) {
  const productContractCostBreakdown = useMemo(
    () => (isProductDirectionPackage ? computeProductContractCostBreakdown(form) : null),
    [isProductDirectionPackage, form]
  );

  const contractTotalFromMainEstimate = useMemo(() => {
    if (isProductDirectionPackage) return null;
    return applyPackageContractDiscountToNullableBase(
      form.estimate.snapshot?.total ?? null,
      form.contract.discountPercent
    );
  }, [isProductDirectionPackage, form.estimate.snapshot?.total, form.contract.discountPercent]);

  useEffect(() => {
    if (isProductDirectionPackage) return;
    const contractFields = packageEstimateTotalToContractFields(contractTotalFromMainEstimate);
    const cur = formRef.current.contract;
    if (
      cur.totalAmount === contractFields.totalAmount &&
      cur.totalAmountWords === contractFields.totalAmountWords &&
      cur.recommendedPrepayment === contractFields.recommendedPrepayment
    ) {
      return;
    }
    setForm((p) => ({
      ...p,
      contract: {
        ...p.contract,
        totalAmount: contractFields.totalAmount,
        totalAmountWords: contractFields.totalAmountWords,
        recommendedPrepayment: contractFields.recommendedPrepayment,
      },
    }));
    touchPackageData();
  }, [
    isProductDirectionPackage,
    contractTotalFromMainEstimate,
    formRef,
    setForm,
    touchPackageData,
  ]);

  useEffect(() => {
    if (!isProductDirectionPackage || !productContractCostBreakdown) return;
    const contractFields = productContractTotalToContractFields(
      productContractCostBreakdown.totalAmount
    );
    const cur = formRef.current.contract;
    if (
      cur.totalAmount === contractFields.totalAmount &&
      cur.totalAmountWords === contractFields.totalAmountWords &&
      cur.recommendedPrepayment === contractFields.recommendedPrepayment
    ) {
      return;
    }
    setForm((p) => ({
      ...p,
      contract: {
        ...p.contract,
        totalAmount: contractFields.totalAmount,
        totalAmountWords: contractFields.totalAmountWords,
        recommendedPrepayment: contractFields.recommendedPrepayment,
      },
    }));
    touchPackageData();
  }, [isProductDirectionPackage, productContractCostBreakdown, formRef, setForm, touchPackageData]);

  return {
    productContractCostBreakdown,
    contractTotalFromMainEstimate,
  };
}

export type UsePackageAddendumDocumentDateAutofillOptions = {
  activeAddendumSlot: number | null;
  form: PackageFormData;
  setForm: React.Dispatch<React.SetStateAction<PackageFormData>>;
  touchPackageData: () => void;
};

export function usePackageAddendumSlotActions({
  activeAddendumSlot,
  form,
  setForm,
  touchPackageData,
}: UsePackageAddendumDocumentDateAutofillOptions) {
  const markAddendumSlotSigned = useCallback(
    (slotIndex0: number) => {
      setForm((p) => {
        const slots = [...p.addendumSlots] as PackageFormData['addendumSlots'];
        const cur = slots[slotIndex0];
        if (!cur || cur.status !== 'OPEN') return p;
        slots[slotIndex0] = {
          ...cur,
          status: 'SIGNED',
          signedAt: new Date().toISOString(),
          paidAt: '',
        };
        return { ...p, addendumSlots: slots };
      });
      touchPackageData();
    },
    [setForm, touchPackageData]
  );

  const patchAddendumDocumentDate = useCallback(
    (slotIndex0: number, value: string) => {
      setForm((p) => {
        const next: [string, string, string, string, string] = [...p.addendumDocumentDates] as [
          string,
          string,
          string,
          string,
          string,
        ];
        if (slotIndex0 >= 0 && slotIndex0 < 5) next[slotIndex0] = value;
        return { ...p, addendumDocumentDates: next };
      });
      touchPackageData();
    },
    [setForm, touchPackageData]
  );

  useEffect(() => {
    if (activeAddendumSlot === null) return;
    const idx = activeAddendumSlot - 1;
    if (idx < 0 || idx >= 5) return;
    const slot = form.addendumSlots[idx];
    if (slot?.status === 'SIGNED' || slot?.status === 'PAID') return;
    if (form.addendumDocumentDates[idx]?.trim()) return;
    patchAddendumDocumentDate(idx, todayContractDateDdMmYyyy());
  }, [
    activeAddendumSlot,
    form.addendumSlots,
    form.addendumDocumentDates,
    patchAddendumDocumentDate,
  ]);

  return {
    markAddendumSlotSigned,
    patchAddendumDocumentDate,
  };
}
