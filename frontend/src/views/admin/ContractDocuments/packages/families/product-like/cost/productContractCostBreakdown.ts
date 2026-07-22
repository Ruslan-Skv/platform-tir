import {
  applyPackageContractDiscountToNullableBase,
  packageEstimateTotalToContractFields,
} from '../../../platform/form/packageContractDiscount';
import type { PackageFormData } from '../../../platform/form/packageForm';
import { computeCeilingsSpecificationNetTotal } from '../ceilings/ceilingsSpecification';
import {
  computeDoorsSpecificationNetTotal,
  sumDoorsSpecificationLinesTotal,
} from '../specification/doorsSpecification';

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

export type ProductContractCostBreakdown = {
  worksAmount: number;
  productsAmount: number;
  totalAmount: number;
  worksDisplay: string;
  productsDisplay: string;
  totalDisplay: string;
};

/** Стоимость работ — из счёта-заказа (смета + скидка по договору); изделия — из спецификации. */
export function computeProductContractCostBreakdown(
  form: PackageFormData
): ProductContractCostBreakdown {
  const discountedWorks = applyPackageContractDiscountToNullableBase(
    form.estimate.snapshot?.total ?? null,
    form.contract.discountPercent
  );
  const worksAmount = discountedWorks ?? 0;
  const ceilingsNet = computeCeilingsSpecificationNetTotal(form.ceilingsSpecification).netTotal;
  const doorsProductsTotal = sumDoorsSpecificationLinesTotal(form.doorsSpecificationLines);
  const doorsNet =
    doorsProductsTotal > 0
      ? computeDoorsSpecificationNetTotal(
          form.doorsSpecificationLines,
          form.doorsSpecificationDiscountPercent
        ).netTotal
      : 0;
  const productsAmount =
    ceilingsNet > 0
      ? ceilingsNet
      : doorsNet > 0
        ? doorsNet
        : parseContractMoneyAmount(form.productSpecificationAmount);
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

export function productContractTotalToContractFields(totalAmount: number) {
  return packageEstimateTotalToContractFields(totalAmount);
}

/** Поля для шаблонов: {{contract.contractCost}}, {{contract.productsCost}}, {{contract.worksCost}}. */
export function productContractCostFieldsForTemplate(form: PackageFormData): {
  contractCost: string;
  productsCost: string;
  worksCost: string;
} {
  const breakdown = computeProductContractCostBreakdown(form);
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
