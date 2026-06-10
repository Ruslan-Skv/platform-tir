import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { isProductDirectionPackageKind } from '../../config/productDirectionPackageKind';
import { computeProductContractCostBreakdown } from '../../families/product-like/cost/productContractCostBreakdown';
import {
  applyPackageContractDiscountToAmount,
  parsePackageContractDiscountPercent,
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

export interface PackagePayableBreakdown {
  /** Сумма по основному договору (поле «Стоимость дог.»). */
  mainContractRub: number | null;
  /** Суммы по Д/с №1… (только открытые слоты, по snapshot). */
  addendumTotalsRub: Array<{ slotIndex1: number; totalRub: number | null }>;
  /** Стоимость договора + суммы по Д/с, где в пакете уже заполнена смета (см. комментарий в расчёте). */
  grandTotalRub: number | null;
}

/**
 * Оценка «сколько всего должны заплатить» по ремонтоподобной форме:
 * основной договор + сметы доп. соглашений по открытым слотам.
 */
function computeRepairLikePayableBreakdown(form: PackageFormData): PackagePayableBreakdown {
  const mainContractRub = parseRubAmountString(form.contract.totalAmount);
  const discountPct = parsePackageContractDiscountPercent(form.contract.discountPercent);
  const addendumTotalsRub: PackagePayableBreakdown['addendumTotalsRub'] = [];
  const count = clampPackageAddendumSlotCount(form.addendumSlotCount);
  let addendumSumKnown = 0;
  for (let i = 0; i < count; i++) {
    const slot = form.addendumSlots[i];
    const t = slot?.snapshot?.total;
    const rawTotal = typeof t === 'number' && Number.isFinite(t) ? t : null;
    const totalRub =
      rawTotal != null ? applyPackageContractDiscountToAmount(rawTotal, discountPct) : null;
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
  const discountPct = parsePackageContractDiscountPercent(form.contract.discountPercent);
  const addendumTotalsRub: PackagePayableBreakdown['addendumTotalsRub'] = [];
  const count = clampPackageAddendumSlotCount(form.addendumSlotCount);
  let addendumSumKnown = 0;
  for (let i = 0; i < count; i++) {
    const slot = form.addendumSlots[i];
    const t = slot?.snapshot?.total;
    const rawTotal = typeof t === 'number' && Number.isFinite(t) ? t : null;
    const totalRub =
      rawTotal != null ? applyPackageContractDiscountToAmount(rawTotal, discountPct) : null;
    addendumTotalsRub.push({ slotIndex1: i + 1, totalRub });
    if (totalRub != null) {
      addendumSumKnown += totalRub;
    }
  }
  const grandTotalRub = mainContractRub != null ? mainContractRub + addendumSumKnown : null;
  return { mainContractRub, addendumTotalsRub, grandTotalRub };
}

export function computePackagePayableBreakdown(
  form: PackageFormData,
  packageKind: ContractDocumentPackageKind = 'REPAIR'
): PackagePayableBreakdown {
  if (isProductDirectionPackageKind(packageKind)) {
    return computeProductPayableBreakdown(form);
  }
  return computeRepairLikePayableBreakdown(form);
}
