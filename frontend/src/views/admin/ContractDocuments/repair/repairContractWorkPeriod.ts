export const DEFAULT_REPAIR_CONTRACT_WORK_PERIOD_DAYS = 60;
export const DEFAULT_WINDOWS_CONTRACT_WORK_PERIOD_DAYS = 90;

export function formatRepairWorkPeriodDays(days: number): string {
  const n = Math.trunc(days);
  if (!Number.isFinite(n) || n < 1) return String(DEFAULT_REPAIR_CONTRACT_WORK_PERIOD_DAYS);
  return String(n);
}

export function parseRepairWorkPeriodInput(raw: string): number | null {
  const s = raw.trim();
  if (!/^\d+$/.test(s)) return null;
  const n = parseInt(s, 10);
  if (!Number.isFinite(n) || n < 1 || n > 3650) return null;
  return n;
}

export function normalizeRepairWorkPeriodInput(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** Значения, которые считаем «не заданными вручную» — подставим актуальный срок из настроек. */
function isLegacyDefaultWorkPeriodDays(days: number, packageKind: 'REPAIR' | 'WINDOWS'): boolean {
  if (packageKind === 'WINDOWS') {
    return (
      days === DEFAULT_WINDOWS_CONTRACT_WORK_PERIOD_DAYS ||
      days === DEFAULT_REPAIR_CONTRACT_WORK_PERIOD_DAYS
    );
  }
  return days === DEFAULT_REPAIR_CONTRACT_WORK_PERIOD_DAYS;
}

export function isRepairWorkPeriodManualFlag(value: unknown): boolean {
  return value === true;
}

export function resolveRepairWorkPeriodForForm(
  stored: string | undefined | null,
  defaultDays: number,
  packageKind: 'REPAIR' | 'WINDOWS' = 'REPAIR',
  workPeriodIsManual = false
): { value: string; autofill: boolean } {
  const trimmed = (stored ?? '').trim();
  if (workPeriodIsManual) {
    const parsedManual = parseRepairWorkPeriodInput(trimmed);
    if (parsedManual !== null) {
      return { value: trimmed, autofill: false };
    }
    return {
      value: formatRepairWorkPeriodDays(defaultDays),
      autofill: true,
    };
  }
  const parsed = parseRepairWorkPeriodInput(trimmed);
  if (parsed !== null) {
    if (parsed !== defaultDays && isLegacyDefaultWorkPeriodDays(parsed, packageKind)) {
      return {
        value: formatRepairWorkPeriodDays(defaultDays),
        autofill: true,
      };
    }
    return { value: trimmed, autofill: false };
  }
  return {
    value: formatRepairWorkPeriodDays(defaultDays),
    autofill: true,
  };
}
