export function formatRub(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('ru-RU').format(value);
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(digits)}%`;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundShare(value: number): number {
  return Math.round(value * 100) / 100;
}

export function shareFromBudget(budget: number | null, total: number): number | null {
  if (budget === null || budget === undefined) return null;
  if (total <= 0) return null;
  return roundShare((budget / total) * 100);
}

export function budgetFromShare(sharePercent: number | null, total: number): number | null {
  if (sharePercent === null || sharePercent === undefined) return null;
  if (total <= 0) return null;
  return roundMoney((total * sharePercent) / 100);
}

export const CHANNEL_CHART_COLORS = [
  '#2563eb',
  '#0d9488',
  '#d97706',
  '#7c3aed',
  '#dc2626',
  '#0891b2',
  '#65a30d',
  '#db2777',
];

export function chartColor(index: number): string {
  return CHANNEL_CHART_COLORS[index % CHANNEL_CHART_COLORS.length];
}

export function slugifyChannelCode(name: string): string {
  const map: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'e',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
  };
  return name
    .toLowerCase()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 64);
}

export function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** SVG donut segments from values */
export function buildDonutSegments(
  items: Array<{ id: string; label: string; value: number }>,
  colors: string[] = CHANNEL_CHART_COLORS
): Array<{
  id: string;
  label: string;
  value: number;
  percent: number;
  color: string;
  dasharray: string;
  dashoffset: number;
}> {
  const total = items.reduce((s, i) => s + Math.max(0, i.value), 0);
  if (total <= 0) return [];

  const circumference = 2 * Math.PI * 40; // r=40
  let offset = 0;

  return items
    .filter((i) => i.value > 0)
    .map((item, index) => {
      const percent = (item.value / total) * 100;
      const length = (item.value / total) * circumference;
      const segment = {
        id: item.id,
        label: item.label,
        value: item.value,
        percent: roundShare(percent),
        color: colors[index % colors.length],
        dasharray: `${length} ${circumference - length}`,
        dashoffset: -offset,
      };
      offset += length;
      return segment;
    });
}
