export const DEFAULT_REPAIR_CONTRACT_WORK_PERIOD_DAYS = 60;
export const DEFAULT_WINDOWS_CONTRACT_WORK_PERIOD_DAYS = 90;
/** Вычитается из цены позиции счёт-заказа при расчёте заказ-наряда «Окна». */
export const DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT = 33;

export function workPeriodDaysToFormValue(days: number): string {
  const n = Math.trunc(days);
  if (!Number.isFinite(n) || n < 1) return String(DEFAULT_REPAIR_CONTRACT_WORK_PERIOD_DAYS);
  return String(n);
}

export function parseWorkPeriodDaysFromFormValue(raw: unknown): number | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const s = String(raw).trim();
  if (!/^\d+$/.test(s)) return null;
  const n = parseInt(s, 10);
  if (!Number.isFinite(n) || n < 1 || n > 3650) return null;
  return n;
}

function contractBlockFromFormData(formData: unknown): Record<string, unknown> {
  const base =
    formData && typeof formData === 'object' && !Array.isArray(formData)
      ? (formData as Record<string, unknown>)
      : {};
  const contractRaw = base.contract;
  return contractRaw && typeof contractRaw === 'object' && !Array.isArray(contractRaw)
    ? { ...(contractRaw as Record<string, unknown>) }
    : {};
}

export function isWorkPeriodManualInFormData(formData: unknown): boolean {
  return contractBlockFromFormData(formData).workPeriodIsManual === true;
}

export function injectDefaultWorkPeriodIntoFormData(
  formData: unknown,
  defaultDays: number,
): Record<string, unknown> {
  const base =
    formData && typeof formData === 'object' && !Array.isArray(formData)
      ? { ...(formData as Record<string, unknown>) }
      : {};
  const contract = contractBlockFromFormData(formData);
  if (contract.workPeriodIsManual === true) {
    return { ...base, contract };
  }
  if (!parseWorkPeriodDaysFromFormValue(contract.workPeriod)) {
    contract.workPeriod = workPeriodDaysToFormValue(defaultDays);
    contract.workPeriodIsManual = false;
  }
  return { ...base, contract };
}

export function setWorkPeriodInFormData(
  formData: unknown,
  workPeriodDays: number,
): Record<string, unknown> {
  const base =
    formData && typeof formData === 'object' && !Array.isArray(formData)
      ? { ...(formData as Record<string, unknown>) }
      : {};
  const contract = contractBlockFromFormData(formData);
  contract.workPeriod = workPeriodDaysToFormValue(workPeriodDays);
  contract.workPeriodIsManual = false;
  return { ...base, contract };
}
