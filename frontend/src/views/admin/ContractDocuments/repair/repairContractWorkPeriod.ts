export const DEFAULT_REPAIR_CONTRACT_WORK_PERIOD_DAYS = 60;

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

export function resolveRepairWorkPeriodForForm(
  stored: string | undefined | null,
  defaultDays: number
): { value: string; autofill: boolean } {
  const trimmed = (stored ?? '').trim();
  if (trimmed && parseRepairWorkPeriodInput(trimmed) !== null) {
    return { value: trimmed, autofill: false };
  }
  return {
    value: formatRepairWorkPeriodDays(defaultDays),
    autofill: true,
  };
}
