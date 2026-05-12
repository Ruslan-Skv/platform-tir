import {
  applyRepairContractDiscountToAmount,
  parseRepairContractDiscountPercent,
} from './repairContractDiscount';
import type { RepairPackageFormData } from './repairPackageForm';

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

export interface RepairPackagePayableBreakdown {
  /** Сумма по основному договору (поле «Стоимость дог.»). */
  mainContractRub: number | null;
  /** Суммы по Д/с №1… (только открытые слоты, по snapshot). */
  addendumTotalsRub: Array<{ slotIndex1: number; totalRub: number | null }>;
  /** Стоимость договора + суммы по Д/с, где в пакете уже заполнена смета (см. комментарий в расчёте). */
  grandTotalRub: number | null;
}

/**
 * Оценка «сколько всего должны заплатить» по текущей форме пакета:
 * основной договор + сметы доп. соглашений по открытым слотам.
 */
export function computeRepairPackagePayableBreakdown(
  form: RepairPackageFormData
): RepairPackagePayableBreakdown {
  const mainContractRub = parseRubAmountString(form.contract.totalAmount);
  const discountPct = parseRepairContractDiscountPercent(form.contract.discountPercent);
  const addendumTotalsRub: RepairPackagePayableBreakdown['addendumTotalsRub'] = [];
  const count = Math.min(5, Math.max(1, form.addendumSlotCount || 1));
  let addendumSumKnown = 0;
  for (let i = 0; i < count; i++) {
    const slot = form.addendumSlots[i];
    const t = slot?.snapshot?.total;
    const rawTotal = typeof t === 'number' && Number.isFinite(t) ? t : null;
    const totalRub =
      rawTotal != null ? applyRepairContractDiscountToAmount(rawTotal, discountPct) : null;
    addendumTotalsRub.push({ slotIndex1: i + 1, totalRub });
    if (totalRub != null) {
      addendumSumKnown += totalRub;
    }
  }
  /** Итого: стоимость основного договора + суммы по Д/с, где в пакете уже есть смета (остальные слоты не увеличивают итог). */
  const grandTotalRub = mainContractRub != null ? mainContractRub + addendumSumKnown : null;
  return { mainContractRub, addendumTotalsRub, grandTotalRub };
}
