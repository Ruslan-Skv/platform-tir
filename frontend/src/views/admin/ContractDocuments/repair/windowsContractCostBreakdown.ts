import {
  applyRepairContractDiscountToNullableBase,
  repairEstimateTotalToContractFields,
} from './repairContractDiscount';
import type { RepairPackageFormData } from './repairPackageForm';

export function parseContractMoneyAmount(raw: string | undefined | null): number {
  const normalized = (raw ?? '').replace(/\s+/g, '').replace(',', '.');
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function formatContractMoneyAmount(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '';
  return value.toFixed(2).replace('.', ',');
}

export type WindowsContractCostBreakdown = {
  worksAmount: number;
  productsAmount: number;
  totalAmount: number;
  worksDisplay: string;
  productsDisplay: string;
  totalDisplay: string;
};

/** Стоимость работ — из счёта-заказа (смета + скидка по договору); изделия — из спецификации. */
export function computeWindowsContractCostBreakdown(
  form: RepairPackageFormData
): WindowsContractCostBreakdown {
  const discountedWorks = applyRepairContractDiscountToNullableBase(
    form.estimate.snapshot?.total ?? null,
    form.contract.discountPercent
  );
  const worksAmount = discountedWorks ?? 0;
  const productsAmount = parseContractMoneyAmount(form.windowsSpecificationAmount);
  const totalAmount = worksAmount + productsAmount;

  return {
    worksAmount,
    productsAmount,
    totalAmount,
    worksDisplay: formatContractMoneyAmount(worksAmount),
    productsDisplay: formatContractMoneyAmount(productsAmount),
    totalDisplay: formatContractMoneyAmount(totalAmount),
  };
}

export function windowsContractTotalToContractFields(totalAmount: number) {
  return repairEstimateTotalToContractFields(totalAmount);
}

/** Поля для шаблонов: {{contract.contractCost}}, {{contract.productsCost}}, {{contract.worksCost}}. */
export function repairContractCostFieldsForTemplate(form: RepairPackageFormData): {
  contractCost: string;
  productsCost: string;
  worksCost: string;
} {
  const breakdown = computeWindowsContractCostBreakdown(form);
  const hasWorks =
    form.estimate.snapshot?.total != null && Number.isFinite(form.estimate.snapshot.total);
  const hasProducts = breakdown.productsAmount > 0;
  const contractCost =
    form.contract.totalAmount.trim() || (hasWorks || hasProducts ? breakdown.totalDisplay : '');
  return {
    contractCost,
    productsCost: hasProducts ? breakdown.productsDisplay : '',
    worksCost: hasWorks ? breakdown.worksDisplay : '',
  };
}
