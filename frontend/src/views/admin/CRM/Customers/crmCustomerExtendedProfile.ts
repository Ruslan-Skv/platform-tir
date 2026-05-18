/** Ключи блока реквизитов в `Customer.extendedProfile` (как в пакете «Ремонт»). */
export const CRM_PROFILE_ADDRESS_KEY = 'address';
export const CRM_PROFILE_OBJECT_ADDRESSES_KEY = 'objectAddresses';

export function parseObjectAddresses(ext: Record<string, unknown> | null | undefined): string[] {
  const raw = ext?.[CRM_PROFILE_OBJECT_ADDRESSES_KEY];
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
}

export function normalizeObjectAddresses(values: readonly string[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed && !out.includes(trimmed)) out.push(trimmed);
  }
  return out;
}
