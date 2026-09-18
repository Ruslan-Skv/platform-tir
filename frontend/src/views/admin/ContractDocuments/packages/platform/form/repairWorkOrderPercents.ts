import type { PackageFormData } from './types';

/** Глобальные налог/наценка заказ-наряда по ремонту из настроек (null — не заданы). */
export type RepairWorkOrderGlobalPercents = {
  workOrderMarkupPercent?: number | null;
  workOrderTaxPercent?: number | null;
};

function normalizeGlobalPercent(raw: unknown): string | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) return null;
  return String(Math.min(100, Math.trunc(raw)));
}

/**
 * Заполняет пустые налог/наценку заказ-наряда ремонта из глобальных настроек.
 * Значение, заданное в данных пакета, всегда приоритетнее глобального —
 * у подписанных документов расчёт не меняется задним числом.
 */
export function applyRepairWorkOrderGlobalDefaults(
  form: PackageFormData,
  global: RepairWorkOrderGlobalPercents | null | undefined
): { form: PackageFormData; changed: boolean } {
  if (!global) return { form, changed: false };
  const tax = form.workOrder.taxPercent.trim();
  const markup = form.workOrder.markupPercent.trim();
  const globalTax = normalizeGlobalPercent(global.workOrderTaxPercent);
  const globalMarkup = normalizeGlobalPercent(global.workOrderMarkupPercent);
  const nextTax = tax === '' && globalTax !== null ? globalTax : tax;
  const nextMarkup = markup === '' && globalMarkup !== null ? globalMarkup : markup;
  if (nextTax === tax && nextMarkup === markup) return { form, changed: false };
  return {
    form: {
      ...form,
      workOrder: { ...form.workOrder, taxPercent: nextTax, markupPercent: nextMarkup },
    },
    changed: true,
  };
}
