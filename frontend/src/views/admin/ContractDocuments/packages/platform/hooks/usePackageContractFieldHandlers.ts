'use client';

import { useCallback, useEffect } from 'react';

import { amountToRussianWords } from '../../../core/amountToRussianWords';
import { formatPackageMoneyValue } from '../editor/estimateTabUi';
import {
  applyPackageContractDiscountToAmount,
  packageEstimateTotalToContractFields,
  parsePackageContractDiscountPercent,
} from '../form/packageContractDiscount';
import { PACKAGE_CONTRACT_FIELDS_EDITABLE_WHEN_SIGNED } from '../form/packageContractFieldPolicy';
import type { PackageFormData } from '../form/packageForm';

function parseDecimalAmount(raw: string): number | null {
  const normalized = raw.replace(/\s+/g, '').replace(',', '.');
  if (!normalized) return null;
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export type UsePackageContractFieldHandlersOptions = {
  form: PackageFormData;
  setForm: React.Dispatch<React.SetStateAction<PackageFormData>>;
  contractAndEstimateLocked: boolean;
  isSuperAdmin: boolean;
  touchPackageData: () => void;
};

export function usePackageContractFieldHandlers({
  form,
  setForm,
  contractAndEstimateLocked,
  isSuperAdmin,
  touchPackageData,
}: UsePackageContractFieldHandlersOptions) {
  const updateObject = useCallback(
    <K extends keyof PackageFormData['object']>(key: K, value: string) => {
      if (contractAndEstimateLocked) return;
      setForm((p) => ({ ...p, object: { ...p.object, [key]: value } }));
      touchPackageData();
    },
    [contractAndEstimateLocked, setForm, touchPackageData]
  );

  const updateWorkOrder = useCallback(
    <K extends keyof PackageFormData['workOrder']>(
      key: K,
      value: PackageFormData['workOrder'][K]
    ) => {
      setForm((p) => ({ ...p, workOrder: { ...p.workOrder, [key]: value } }));
      touchPackageData();
    },
    [setForm, touchPackageData]
  );

  const updateContract = useCallback(
    <K extends keyof PackageFormData['contract']>(key: K, value: string) => {
      if (key === 'workPeriod' && !isSuperAdmin) {
        return;
      }
      if (
        contractAndEstimateLocked &&
        !PACKAGE_CONTRACT_FIELDS_EDITABLE_WHEN_SIGNED.has(String(key))
      ) {
        return;
      }
      setForm((p) => {
        const nextContract = { ...p.contract, [key]: value };
        if (key === 'workPeriod') {
          nextContract.workPeriodIsManual = true;
        }
        if (key === 'discountPercent') {
          const base = p.estimate.snapshot?.total;
          if (typeof base === 'number' && Number.isFinite(base)) {
            const after = applyPackageContractDiscountToAmount(
              base,
              parsePackageContractDiscountPercent(value)
            );
            const fields = packageEstimateTotalToContractFields(after);
            nextContract.totalAmount = fields.totalAmount;
            nextContract.totalAmountWords = fields.totalAmountWords;
            nextContract.recommendedPrepayment = fields.recommendedPrepayment;
          }
        }
        if (key === 'totalAmount') {
          nextContract.totalAmountWords = amountToRussianWords(value);
          const parsedAmount = parseDecimalAmount(value);
          nextContract.recommendedPrepayment =
            parsedAmount === null ? '' : formatPackageMoneyValue(parsedAmount * 0.7);
        }
        if (key === 'prepaymentAmount') {
          nextContract.prepaymentAmountWords = value.trim() ? amountToRussianWords(value) : '';
        }
        return { ...p, contract: nextContract };
      });
      touchPackageData();
    },
    [contractAndEstimateLocked, isSuperAdmin, setForm, touchPackageData]
  );

  useEffect(() => {
    setForm((p) => {
      const raw = p.contract.prepaymentAmount;
      const nextWords = raw.trim() ? amountToRussianWords(raw) : '';
      if (p.contract.prepaymentAmountWords === nextWords) return p;
      return { ...p, contract: { ...p.contract, prepaymentAmountWords: nextWords } };
    });
  }, [form.contract.prepaymentAmount, setForm]);

  return {
    updateContract,
    updateObject,
    updateWorkOrder,
  };
}
