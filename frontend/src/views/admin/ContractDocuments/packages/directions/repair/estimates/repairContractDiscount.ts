import { amountToRussianWords } from '../../../../shared/amountToRussianWords';

function formatMoneyValue(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

/** Процент скидки по договору из поля формы: 0…100, пусто и нечисло → 0. */
export function parseRepairContractDiscountPercent(raw: string | undefined | null): number {
  if (raw == null) return 0;
  const normalized = String(raw).trim().replace(/\s+/g, '').replace(',', '.');
  if (!normalized) return 0;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 0;
  if (parsed < 0) return 0;
  if (parsed > 100) return 100;
  return parsed;
}

export function repairContractDiscountMoneyFactor(discountPercent: number): number {
  const p = Math.min(100, Math.max(0, discountPercent));
  return Math.max(0, 1 - p / 100);
}

export function applyRepairContractDiscountToAmount(
  amount: number,
  discountPercent: number
): number {
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return amount * repairContractDiscountMoneyFactor(discountPercent);
}

export function applyRepairContractDiscountToNullableBase(
  base: number | null | undefined,
  discountPercentRaw: string | undefined | null
): number | null {
  if (base == null || !Number.isFinite(base)) return null;
  return applyRepairContractDiscountToAmount(
    base,
    parseRepairContractDiscountPercent(discountPercentRaw ?? '')
  );
}

/** Поля суммы договора из числа (после скидки), как при автозаполнении из сметы. */
export function repairEstimateTotalToContractFields(totalAfterDiscount: number | null): {
  totalAmount: string;
  totalAmountWords: string;
  recommendedPrepayment: string;
} {
  if (totalAfterDiscount == null || !Number.isFinite(totalAfterDiscount)) {
    return {
      totalAmount: '',
      totalAmountWords: '',
      recommendedPrepayment: '',
    };
  }
  const totalAmount = totalAfterDiscount.toFixed(2).replace('.', ',');
  return {
    totalAmount,
    totalAmountWords: amountToRussianWords(totalAmount),
    recommendedPrepayment: formatMoneyValue(totalAfterDiscount * 0.7),
  };
}
