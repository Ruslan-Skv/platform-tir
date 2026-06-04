import {
  applyRepairContractDiscountToAmount,
  parseRepairContractDiscountPercent,
} from './repairContractDiscount';
import type { RepairEstimateBlock } from './repairPackageForm';

export const DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT = 33;

export function normalizeWindowsWorkOrderMarkupPercent(value: unknown): number {
  const n =
    typeof value === 'number'
      ? value
      : Number.parseFloat(
          String(value ?? '')
            .trim()
            .replace(',', '.')
        );
  if (!Number.isFinite(n) || n < 0) return DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT;
  return Math.min(100, Math.max(0, Math.trunc(n)));
}

export type WindowsWorkOrderLine = {
  name: string;
  unit: string;
  quantity: number;
  originalPrice: number;
  originalAmount: number;
  adjustedPrice: number;
  adjustedAmount: number;
};

export type WindowsWorkOrderRoom = {
  name: string;
  originalTotal: number;
  adjustedTotal: number;
  lines: WindowsWorkOrderLine[];
};

export type WindowsWorkOrderComputed = {
  markupPercent: number;
  rooms: WindowsWorkOrderRoom[];
  originalTotal: number;
  adjustedTotal: number;
};

/** Заказ-наряд «Окна»: цена позиции = цена в счёт-заказе минус наценка из настроек (и скидка по договору). */
export function buildWindowsWorkOrderComputed(
  snapshot: RepairEstimateBlock['snapshot'],
  contractDiscountPercentRaw: string,
  markupPercentRaw: unknown
): WindowsWorkOrderComputed {
  const markupPercent = normalizeWindowsWorkOrderMarkupPercent(markupPercentRaw);
  const markupFactor = 1 - markupPercent / 100;
  const contractDiscountPercent = parseRepairContractDiscountPercent(contractDiscountPercentRaw);
  const rooms: WindowsWorkOrderRoom[] = (snapshot?.rooms ?? []).map((room) => {
    const lines: WindowsWorkOrderLine[] = room.lines.map((line) => {
      const afterDiscountPrice = applyRepairContractDiscountToAmount(
        line.price,
        contractDiscountPercent
      );
      const afterDiscountAmount = applyRepairContractDiscountToAmount(
        line.amount,
        contractDiscountPercent
      );
      return {
        name: line.name,
        unit: line.unit,
        quantity: line.quantity,
        originalPrice: line.price,
        originalAmount: line.amount,
        adjustedPrice: afterDiscountPrice * markupFactor,
        adjustedAmount: afterDiscountAmount * markupFactor,
      };
    });
    const adjustedTotal = lines.reduce((sum, line) => sum + line.adjustedAmount, 0);
    const originalTotal = lines.reduce((sum, line) => sum + line.originalAmount, 0);
    return {
      name: room.name,
      originalTotal,
      adjustedTotal,
      lines,
    };
  });
  const originalTotal = rooms.reduce((sum, room) => sum + room.originalTotal, 0);
  const adjustedTotal = rooms.reduce((sum, room) => sum + room.adjustedTotal, 0);
  return {
    markupPercent,
    rooms,
    originalTotal,
    adjustedTotal,
  };
}
