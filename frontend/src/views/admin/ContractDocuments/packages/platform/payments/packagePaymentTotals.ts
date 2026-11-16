import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { isFurnitureLikePackageKind } from '../../config';
import { isProductDirectionPackageKind } from '../../config/productDirectionPackageKind';
import {
  FURNITURE_LEG_LABEL,
  type FurniturePackageLegId,
} from '../../directions/furniture/furnitureLegs';
import {
  computeWindowsAddendumTotals,
  windowsAddendumSlotHasAnyPrintContent,
} from '../../families/product-like/addendum/addendumSpecification';
import { computeProductContractCostBreakdown } from '../../families/product-like/cost/productContractCostBreakdown';
import {
  applyPackageContractDiscountToAmount,
  resolveAddendumSlotDiscount,
} from '../form/packageContractDiscount';
import { type PackageFormData, clampPackageAddendumSlotCount } from '../form/packageForm';

/** Парсит сумму из полей договора (пробелы, «руб.», запятая как десятичный разделитель). */
export function parseRubAmountString(raw: string | undefined | null): number | null {
  if (raw == null) return null;
  const s = raw
    .trim()
    .replace(/\s+/g, '')
    .replace(/руб\.?/gi, '')
    .replace(',', '.');
  if (!s) return null;
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export type PackageFurnitureLegPayable = {
  legId: FurniturePackageLegId;
  label: string;
  totalRub: number | null;
  recommendedPrepaymentRub: number | null;
};

export interface PackagePayableBreakdown {
  /** Сумма по основному договору (поле «Стоимость дог.»). */
  mainContractRub: number | null;
  /** Суммы по Д/с №1… (доп. работы за вычетом непроводимых, как в печати Д/с). */
  addendumTotalsRub: Array<{ slotIndex1: number; totalRub: number | null }>;
  /** Стоимость договора + суммы по Д/с, где в пакете уже заполнена смета (см. комментарий в расчёте). */
  grandTotalRub: number | null;
  /** Мебель: включённые ноги с суммами (для сводки и оснований ПКО). */
  furnitureLegs?: PackageFurnitureLegPayable[];
}

/**
 * Чистый итог слота Д/с без скидки: доп. работы − непроводимые
 * (как «Итого по смете» в печати Д/с). null — в слоте нет ни одного расчёта.
 * Отрицательный итог — исключений больше, чем добавлений («уменьшение договора»).
 */
function resolveAddendumSlotNetTotalRub(
  slot: PackageFormData['addendumSlots'][number] | undefined
): number | null {
  const additional = slot?.snapshot?.total;
  const excluded = slot?.excludedSnapshot?.total;
  const hasAdditional = typeof additional === 'number' && Number.isFinite(additional);
  const hasExcluded = typeof excluded === 'number' && Number.isFinite(excluded);
  if (!hasAdditional && !hasExcluded) return null;
  return (hasAdditional ? (additional as number) : 0) - (hasExcluded ? (excluded as number) : 0);
}

/** Итог слота со скидкой: скидка — только к доплате (net > 0), «уменьшение
 * договора» (net < 0) проходит как есть — как в расчёте Д/с «Окна». */
function resolveAddendumSlotDiscountedTotalRub(
  form: PackageFormData,
  slotIndex0: number,
  rawTotal: number
): number {
  if (rawTotal < 0) return rawTotal;
  // Скидка Д/с замещает договорную (INHERIT → договоровая).
  const slotDiscountPct = resolveAddendumSlotDiscount(form, slotIndex0).percent;
  return applyPackageContractDiscountToAmount(rawTotal, slotDiscountPct);
}

/**
 * Оценка «сколько всего должны заплатить» по ремонтоподобной форме:
 * основной договор + сметы доп. соглашений по открытым слотам.
 */
function computeRepairLikePayableBreakdown(form: PackageFormData): PackagePayableBreakdown {
  const mainContractRub = parseRubAmountString(form.contract.totalAmount);
  const addendumTotalsRub: PackagePayableBreakdown['addendumTotalsRub'] = [];
  const count = clampPackageAddendumSlotCount(form.addendumSlotCount);
  let addendumSumKnown = 0;
  for (let i = 0; i < count; i++) {
    const slot = form.addendumSlots[i];
    const rawTotal = resolveAddendumSlotNetTotalRub(slot);
    const totalRub =
      rawTotal != null ? resolveAddendumSlotDiscountedTotalRub(form, i, rawTotal) : null;
    addendumTotalsRub.push({ slotIndex1: i + 1, totalRub });
    if (totalRub != null) {
      addendumSumKnown += totalRub;
    }
  }
  /** Итого: стоимость основного договора + суммы по Д/с, где в пакете уже есть смета (остальные слоты не увеличивают итог). */
  const grandTotalRub = mainContractRub != null ? mainContractRub + addendumSumKnown : null;
  return { mainContractRub, addendumTotalsRub, grandTotalRub };
}

/** Сводка к оплате для пакета «Окна»: изделия + работы + доп. соглашения с расчётами. */
export function computeProductPayableBreakdown(form: PackageFormData): PackagePayableBreakdown {
  const breakdown = computeProductContractCostBreakdown(form);
  const mainContractRub = breakdown.totalAmount > 0 ? breakdown.totalAmount : null;
  const addendumTotalsRub: PackagePayableBreakdown['addendumTotalsRub'] = [];
  const count = clampPackageAddendumSlotCount(form.addendumSlotCount);
  let addendumSumKnown = 0;
  for (let i = 0; i < count; i++) {
    const slot = form.addendumSlots[i];
    // Итог Д/с «Окна» = строки «Изменений в Спецификации» + счёт-заказ за вычетом
    // исключённого (со скидкой договора). Считаем и без прикреплённых расчётов —
    // Д/с может состоять только из вручную заполненной спецификации.
    let totalRub: number | null = null;
    if (slot && windowsAddendumSlotHasAnyPrintContent(slot)) {
      const addendumBreakdown = computeWindowsAddendumTotals({
        slot,
        accountAdditionalTotal: slot.snapshot?.total ?? 0,
        accountExcludedTotal: slot.excludedSnapshot?.total ?? 0,
        contractDiscountPercent: form.contract.discountPercent,
      });
      const grand = addendumBreakdown.grandTotal;
      // Отрицательный итог — д/с уменьшает договор (исключений больше, чем добавлений):
      // строку в сводке показываем, но пункта «оплата по д/с» не появляется (сумма к доплате ≤ 0).
      totalRub = Number.isFinite(grand) ? grand : null;
    }
    addendumTotalsRub.push({ slotIndex1: i + 1, totalRub });
    if (totalRub != null) {
      addendumSumKnown += totalRub;
    }
  }
  const grandTotalRub = mainContractRub != null ? mainContractRub + addendumSumKnown : null;
  return { mainContractRub, addendumTotalsRub, grandTotalRub };
}

/** К оплате по пакету «Мебель»: сумма включённых ног + Д/с. */
export function computeFurniturePayableBreakdown(form: PackageFormData): PackagePayableBreakdown {
  const furniture = form.furniture;
  const furnitureLegs: PackageFurnitureLegPayable[] = [];
  let legsSum = 0;
  let hasAnyLegTotal = false;

  const pushLeg = (legId: FurniturePackageLegId, enabled: boolean) => {
    if (!enabled || !furniture) return;
    const leg = furniture[legId];
    const totalRub = parseRubAmountString(leg.contract.totalAmount);
    const recommendedPrepaymentRub = parseRubAmountString(leg.contract.recommendedPrepayment);
    furnitureLegs.push({
      legId,
      label: FURNITURE_LEG_LABEL[legId],
      totalRub,
      recommendedPrepaymentRub,
    });
    if (totalRub != null) {
      legsSum += totalRub;
      hasAnyLegTotal = true;
    }
  };

  pushLeg('manufacture', true);
  pushLeg('montage', furniture?.montage?.enabled === true);
  pushLeg('appliances', furniture?.appliances?.enabled === true);

  const mainContractRub = hasAnyLegTotal ? legsSum : null;
  const addendumTotalsRub: PackagePayableBreakdown['addendumTotalsRub'] = [];
  const count = clampPackageAddendumSlotCount(form.addendumSlotCount);
  let addendumSumKnown = 0;
  for (let i = 0; i < count; i++) {
    const slot = form.addendumSlots[i];
    const rawTotal = resolveAddendumSlotNetTotalRub(slot);
    const totalRub =
      rawTotal != null ? resolveAddendumSlotDiscountedTotalRub(form, i, rawTotal) : null;
    addendumTotalsRub.push({ slotIndex1: i + 1, totalRub });
    if (totalRub != null) {
      addendumSumKnown += totalRub;
    }
  }
  const grandTotalRub = mainContractRub != null ? mainContractRub + addendumSumKnown : null;
  return { mainContractRub, addendumTotalsRub, grandTotalRub, furnitureLegs };
}

export function computePackagePayableBreakdown(
  form: PackageFormData,
  packageKind: ContractDocumentPackageKind = 'REPAIR'
): PackagePayableBreakdown {
  if (isFurnitureLikePackageKind(packageKind)) {
    return computeFurniturePayableBreakdown(form);
  }
  if (isProductDirectionPackageKind(packageKind)) {
    return computeProductPayableBreakdown(form);
  }
  return computeRepairLikePayableBreakdown(form);
}
