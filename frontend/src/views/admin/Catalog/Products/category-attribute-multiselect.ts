/**
 * Хранение MULTI_SELECT в JSON-массиве строк; обратная совместимость со старыми строками и списком через запятую.
 */

export function encodeMultiSelectValues(selected: string[]): string {
  if (selected.length === 0) return '';
  return JSON.stringify(selected);
}

export function decodeMultiSelectStored(raw: string | undefined | null): string[] {
  const s = String(raw ?? '').trim();
  if (!s) return [];
  try {
    const parsed: unknown = JSON.parse(s);
    if (Array.isArray(parsed) && parsed.every((x): x is string => typeof x === 'string')) {
      return parsed;
    }
  } catch {
    /* legacy */
  }
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

export function multiSelectHasSelection(raw: string | undefined | null): boolean {
  return decodeMultiSelectStored(raw).length > 0;
}
