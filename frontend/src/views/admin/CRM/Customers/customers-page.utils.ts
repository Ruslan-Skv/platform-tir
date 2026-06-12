export function customersFilterFieldClass(
  base: string,
  active: boolean,
  activeClass: string
): string {
  return active ? `${base} ${activeClass}` : base;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateDdMmYyyy(iso: string | null | undefined): string {
  if (!iso?.trim()) return '—';
  const d = new Date(iso);
  if (!Number.isNaN(d.getTime())) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  }
  const [y, m, dayPart] = iso.split('-');
  const day = dayPart?.slice(0, 2);
  if (y && m && day) return `${day}.${m}.${y}`;
  return iso;
}
