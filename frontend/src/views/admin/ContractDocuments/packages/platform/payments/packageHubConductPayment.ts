import type { PackagePaymentBasisOption } from './packagePaymentBasisOptions';
import type { PackagePayableBreakdown } from './packagePaymentTotals';

/** Сумма для поля «Сумма» в блоке «Провести оплату» по выбранному основанию. */
export function computePackageHubConductSuggestedAmountRub(
  option: PackagePaymentBasisOption,
  breakdown: PackagePayableBreakdown,
  journalPaidRub: number,
  contractPaidRub: number,
  addendumPaidByNumber?: ReadonlyMap<number, number>
): number | null {
  const addendumNum = option.addendumNumber;
  if (option.key.startsWith('addendum_partial_') && addendumNum != null) {
    const entry = breakdown.addendumTotalsRub.find((a) => a.slotIndex1 === addendumNum);
    const totalRub = entry?.totalRub;
    if (totalRub == null || !Number.isFinite(totalRub) || totalRub <= 0) return null;
    const paid = addendumPaidByNumber?.get(addendumNum) ?? 0;
    return roundRub(Math.max(0, totalRub - paid));
  }

  if (/^addendum_\d+$/.test(option.key) && addendumNum != null) {
    const entry = breakdown.addendumTotalsRub.find((a) => a.slotIndex1 === addendumNum);
    const totalRub = entry?.totalRub;
    if (totalRub == null || !Number.isFinite(totalRub) || totalRub <= 0) return null;
    return roundRub(totalRub);
  }

  const mainContractRub = breakdown.mainContractRub;
  if (mainContractRub == null || !Number.isFinite(mainContractRub) || mainContractRub <= 0) {
    return null;
  }

  switch (option.key) {
    case 'contract_prepayment':
      return roundRub(mainContractRub * 0.7);
    case 'contract_final': {
      const grandTotalRub = breakdown.grandTotalRub;
      if (grandTotalRub == null || !Number.isFinite(grandTotalRub) || grandTotalRub <= 0) {
        return null;
      }
      const paid = Number.isFinite(journalPaidRub) ? journalPaidRub : 0;
      return roundRub(Math.max(0, grandTotalRub - paid));
    }
    case 'contract_partial':
      return roundRub(Math.max(0, mainContractRub - contractPaidRub));
    default:
      return null;
  }
}

export function formatPackageHubConductAmountInput(amountRub: number): string {
  const rounded = roundRub(amountRub);
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }
  return rounded.toFixed(2).replace('.', ',');
}

function roundRub(n: number): number {
  return Math.round(n * 100) / 100;
}
