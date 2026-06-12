export function formatUser(
  u: { firstName?: string | null; lastName?: string | null } | null | undefined
): string {
  if (!u) return '—';
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || '—';
}

export function formatDate(s: string | null | undefined): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ru-RU');
}
