/** Адреса объектов в `Customer.extendedProfile.objectAddresses`. */
export function parseObjectAddressesFromExtendedProfile(
  ext: Record<string, unknown> | null | undefined,
): string[] {
  const raw = ext?.objectAddresses;
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
