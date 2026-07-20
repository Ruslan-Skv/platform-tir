export const FILTERS_PRICE_STEP = 100;

/** При большем числе значений список опций в сайдбаре ограничивается по высоте и скроллится. */
export const FILTER_OPTIONS_SCROLL_THRESHOLD = 30;

export function filterOptionsListClassName(
  baseClass: string,
  scrollableClass: string,
  optionsCount: number
): string {
  return optionsCount > FILTER_OPTIONS_SCROLL_THRESHOLD
    ? `${baseClass} ${scrollableClass}`
    : baseClass;
}

export function formatFilterOptionLabel(label: string, count: number | undefined): string {
  if (count === undefined || !Number.isFinite(count)) return label;
  return `${label} (${count.toLocaleString('ru-RU')})`;
}

export function formatPriceInput(value: number): string {
  return Math.max(0, Math.round(value)).toLocaleString('ru-RU');
}

export function normalizePriceInput(raw: string): string {
  return raw
    .replace(/[^\d\s]/g, '')
    .replace(/\s+/g, ' ')
    .trimStart();
}

export function parsePriceInput(raw: string): number | null {
  const digits = raw.replace(/\s+/g, '');
  if (!digits) return null;
  const num = Number(digits);
  return Number.isFinite(num) ? num : null;
}

export function clampCatalogPriceRange(
  bounds: { min: number; max: number },
  nextMin: number,
  nextMax: number
): { min: number; max: number } {
  const snap = (v: number) => Math.round(v / FILTERS_PRICE_STEP) * FILTERS_PRICE_STEP;
  const snappedMin = snap(nextMin);
  const snappedMax = snap(nextMax);
  const clampedMin = Math.max(bounds.min, Math.min(snappedMin, bounds.max));
  const clampedMax = Math.max(clampedMin, Math.min(snappedMax, bounds.max));
  return { min: clampedMin, max: clampedMax };
}

export function clearCatalogFilterKeys(params: URLSearchParams): void {
  const toRemove = new Set<string>();
  for (const k of params.keys()) {
    if (
      k.startsWith('attr_') ||
      k === 'avail' ||
      k === 'mfr' ||
      k === 'price_min' ||
      k === 'price_max' ||
      k === 'cat' ||
      k === 'branch'
    ) {
      toRemove.add(k);
    }
  }
  toRemove.forEach((k) => params.delete(k));
  params.delete('page');
}
