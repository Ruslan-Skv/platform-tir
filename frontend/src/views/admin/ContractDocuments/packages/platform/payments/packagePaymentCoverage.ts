import type { ContractDocumentPackagePayment } from '@/shared/api/admin-contract-document-packages';

import type { PackagePayableBreakdown } from './packagePaymentTotals';

/** Допуск при сравнении сумм оплат (руб.). */
export const PACKAGE_PAYMENT_COVERAGE_TOLERANCE_RUB = 0.5;

export type PackageAddendumPaymentCoverage = {
  slotIndex1: number;
  /** Итог Д/с из сводки; может быть отрицательным («уменьшение договора»). */
  totalRub: number | null;
  /** Сколько нужно доплатить по Д/с: null — итог неизвестен, 0 — платить нечего. */
  payableRub: number | null;
  /** Собственные проводки по основанию этого Д/с (возвраты вычитаются). */
  ownPaidRub: number;
  /** Покрыто всего: собственные проводки + перелив из оплат по договору. */
  coveredRub: number;
  paidPct: number | null;
  fullyCovered: boolean;
  /** true — отрицательный Д/с уменьшает сумму, которую клиент должен по договору. */
  reducesContract: boolean;
};

export type PackagePaymentCoverage = {
  /** Проводки по основаниям договора, нетто (возвраты вычитаются). */
  contractPaidRub: number;
  /** Проводки по основаниям Д/с, нетто, по номерам Д/с. */
  byAddendum: Map<number, number>;
  /** Все проводки журнала, нетто. */
  journalTotalRub: number;
  /** Стоимость договора за вычетом уменьшений от отрицательных Д/с. */
  effectiveMainRub: number | null;
  /** Покрыто оплатами по договору (не больше effectiveMainRub). */
  mainCoveredRub: number;
  mainPaidPct: number | null;
  mainRemainderRub: number | null;
  mainFullyCovered: boolean;
  addendums: PackageAddendumPaymentCoverage[];
};

function paidPctRounded(paidRub: number, totalRub: number | null): number | null {
  if (totalRub == null || !Number.isFinite(totalRub) || totalRub <= 0) return null;
  const pct = (paidRub / totalRub) * 100;
  const treatAsFull = paidRub >= totalRub - PACKAGE_PAYMENT_COVERAGE_TOLERANCE_RUB;
  return treatAsFull ? 100 : Math.round(pct);
}

/**
 * Модель покрытия оплат: сколько из суммы сделки фактически закрыто проводками.
 *
 * Правила:
 * — отрицательные Д/с уменьшают сумму по договору: effectiveMainRub = mainContractRub − |Σ отрицательных Д/с|;
 * — оплаты по основаниям договора («предоплата», «частичная», «окончательный расчёт» и т.п.)
 *   сначала закрывают effectiveMainRub, остаток «переливается» на непокрытые положительные
 *   Д/с по порядку номеров — поэтому окончательный расчёт одной суммой закрывает и Д/с;
 * — оплаты по основаниям Д/с идут только на свой Д/с;
 * — Д/с с нулевым/отрицательным итогом платить не нужно (fullyCovered = true);
 *   Д/с с неизвестным итогом (null) не считается оплаченным — как и раньше.
 */
export function computePackagePaymentCoverage(
  breakdown: PackagePayableBreakdown,
  payments: ContractDocumentPackagePayment[] | undefined
): PackagePaymentCoverage {
  let contractPaidRub = 0;
  let journalTotalRub = 0;
  const byAddendum = new Map<number, number>();
  for (const r of payments ?? []) {
    const n = Number.parseFloat(r.amount);
    if (!Number.isFinite(n)) continue;
    // Возврат денег клиенту хранится положительной суммой, но уменьшает оплаченное.
    const signed = r.paymentType === 'REFUND' ? -n : n;
    journalTotalRub += signed;
    if (r.paymentType === 'AMENDMENT' && r.addendumNumber != null && r.addendumNumber >= 1) {
      byAddendum.set(r.addendumNumber, (byAddendum.get(r.addendumNumber) ?? 0) + signed);
    } else {
      contractPaidRub += signed;
    }
  }

  let reductionRub = 0;
  for (const a of breakdown.addendumTotalsRub) {
    if (a.totalRub != null && Number.isFinite(a.totalRub) && a.totalRub < 0) {
      reductionRub += Math.abs(a.totalRub);
    }
  }
  const mainRaw = breakdown.mainContractRub;
  const effectiveMainRub =
    mainRaw != null && Number.isFinite(mainRaw) ? Math.max(0, mainRaw - reductionRub) : null;

  const mainCoveredRub =
    effectiveMainRub != null ? Math.min(Math.max(0, contractPaidRub), effectiveMainRub) : 0;
  const mainFullyCovered =
    effectiveMainRub != null &&
    (effectiveMainRub <= PACKAGE_PAYMENT_COVERAGE_TOLERANCE_RUB ||
      mainCoveredRub >= effectiveMainRub - PACKAGE_PAYMENT_COVERAGE_TOLERANCE_RUB);

  // Перелив: оплаты «по договору» сверх эффективной суммы закрывают положительные Д/с.
  let spillRemainingRub =
    effectiveMainRub != null ? Math.max(0, contractPaidRub - effectiveMainRub) : 0;

  const addendums: PackageAddendumPaymentCoverage[] = breakdown.addendumTotalsRub.map((a) => {
    const totalRub = a.totalRub != null && Number.isFinite(a.totalRub) ? a.totalRub : null;
    const payableRub = totalRub != null ? Math.max(0, totalRub) : null;
    const ownPaidRub = byAddendum.get(a.slotIndex1) ?? 0;
    if (payableRub == null) {
      return {
        slotIndex1: a.slotIndex1,
        totalRub,
        payableRub: null,
        ownPaidRub,
        coveredRub: 0,
        paidPct: null,
        fullyCovered: false,
        reducesContract: false,
      };
    }
    if (payableRub <= PACKAGE_PAYMENT_COVERAGE_TOLERANCE_RUB) {
      // Платить нечего: нулевой итог или «уменьшение договора» (отрицательный итог).
      return {
        slotIndex1: a.slotIndex1,
        totalRub,
        payableRub,
        ownPaidRub,
        coveredRub: 0,
        paidPct: null,
        fullyCovered: true,
        reducesContract: (totalRub ?? 0) < 0,
      };
    }
    const ownEffectiveRub = Math.min(Math.max(0, ownPaidRub), payableRub);
    const spillRub = Math.min(payableRub - ownEffectiveRub, spillRemainingRub);
    spillRemainingRub -= spillRub;
    const coveredRub = ownEffectiveRub + spillRub;
    return {
      slotIndex1: a.slotIndex1,
      totalRub,
      payableRub,
      ownPaidRub,
      coveredRub,
      paidPct: paidPctRounded(coveredRub, payableRub),
      fullyCovered: coveredRub >= payableRub - PACKAGE_PAYMENT_COVERAGE_TOLERANCE_RUB,
      reducesContract: false,
    };
  });

  return {
    contractPaidRub,
    byAddendum,
    journalTotalRub,
    effectiveMainRub,
    mainCoveredRub,
    mainPaidPct: paidPctRounded(mainCoveredRub, effectiveMainRub),
    mainRemainderRub:
      effectiveMainRub != null ? Math.max(0, effectiveMainRub - mainCoveredRub) : null,
    mainFullyCovered,
    addendums,
  };
}
