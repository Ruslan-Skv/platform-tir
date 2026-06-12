export function measurementsFilterFieldClass(
  base: string,
  active: boolean,
  activeClass: string
): string {
  return active ? `${base} ${activeClass}` : base;
}

export function formatDate(s: string | null | undefined): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ru-RU');
}

export function formatUser(
  u: { firstName?: string | null; lastName?: string | null } | null | undefined
): string {
  if (!u) return '—';
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || '—';
}

export function extractEstimatePresetIdsFromPackageForm(formData: unknown): string[] {
  if (!formData || typeof formData !== 'object') return [];
  const estimate = (formData as Record<string, unknown>).estimate;
  if (!estimate || typeof estimate !== 'object') return [];
  const rawIds = (estimate as Record<string, unknown>).estimatePresetIds;
  if (!Array.isArray(rawIds)) return [];
  return rawIds
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    .map((id) => id.trim());
}

export function chooseLatestByUpdatedAt<T extends { updatedAt?: string }>(items: T[]): T | null {
  if (items.length === 0) return null;
  return [...items].sort((a, b) => {
    const da = new Date(a.updatedAt ?? 0).getTime();
    const db = new Date(b.updatedAt ?? 0).getTime();
    return db - da;
  })[0];
}
