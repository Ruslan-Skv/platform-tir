export function formatContractConcludedDateForHeader(iso: string | undefined): string | null {
  const s = iso?.trim();
  if (!s) return null;
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    const base = d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return `${base}г.`;
  } catch {
    return null;
  }
}
