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

export function parseContractCalendarDate(isoOrDateTime: string): Date | null {
  const t = isoOrDateTime.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const d = new Date(`${t}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatContractCalendarDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatContractCalendarDateRu(d: Date): string {
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Добавляет N рабочих дней (пн–пт) к дате начала.
 * День начала — первый рабочий день отсчёта, если это не суббота/воскресенье.
 */
export function addWorkingDaysExcludingWeekends(
  startIso: string,
  workingDays: number
): Date | null {
  const count = Math.trunc(workingDays);
  if (count < 1) return null;
  let cursor = parseContractCalendarDate(startIso);
  if (!cursor) return null;

  let counted = 0;
  for (let guard = 0; guard < 10_000 && counted < count; guard++) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) {
      counted++;
      if (counted === count) {
        return new Date(cursor);
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
}

/** Расчётная дата окончания срока: дата предоплаты 70% + срок в рабочих днях (без выходных). */
export function computeContractDeadlineFromWorkPeriodStart(
  workPeriodStartIso: string | null | undefined,
  workPeriodDaysRaw: string | undefined | null
): { iso: string; labelRu: string; workingDays: number } | null {
  const start = workPeriodStartIso?.trim();
  const workingDays = parseRepairWorkPeriodInput(workPeriodDaysRaw ?? '');
  if (!start || workingDays == null) return null;
  const end = addWorkingDaysExcludingWeekends(start, workingDays);
  if (!end) return null;
  return {
    iso: formatContractCalendarDateIso(end),
    labelRu: formatContractCalendarDateRu(end),
    workingDays,
  };
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
