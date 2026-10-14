/** Опции пагинации журнала выплат — как в журнале ДП. */
export const IS_PAGE_LIMIT_OPTIONS = [20, 50, 100, 200] as const;
export type IsPageLimit = (typeof IS_PAGE_LIMIT_OPTIONS)[number];

/** Записей на странице по умолчанию. */
export const IS_DEFAULT_PAGE_LIMIT: IsPageLimit = 50;

/** Направления раздела — как в реестре направлений пакетов договоров. */
export const IS_DIRECTION_OPTIONS: { value: string; label: string }[] = [
  { value: 'Ремонт', label: 'Ремонт' },
  { value: 'Окна', label: 'Окна' },
  { value: 'Двери', label: 'Двери' },
  { value: 'Потолки', label: 'Потолки' },
  { value: 'Жалюзи', label: 'Жалюзи' },
  { value: 'Мебель', label: 'Мебель' },
];

/** Стадия договора (снимок на момент проводки). */
export const IS_PACKAGE_STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'В работе',
  CONTRACT_CONCLUDED: 'Договор заключён',
  REFUSED: 'Отказ',
};

export function formatIsDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU');
}

/** Сумма выплаты: копейки показываем только когда есть (авансы бывают с ними). */
export function formatIsMoney(value: string | number | null | undefined) {
  if (value == null) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

/** Разряд мастера («6» → «6р»), как в модалке «Заказ-наряды». */
export function formatIsGradeShort(rawGrade: string | null | undefined): string {
  if (!rawGrade) return '';
  const match = rawGrade.match(/\d+/);
  const rank = match ? Number.parseInt(match[0] ?? '', 10) : NaN;
  if (!Number.isFinite(rank)) return rawGrade.trim() || '';
  return `${rank}р`;
}

export function monthBoundsIso(year: number, month: number) {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);
  return { from: toLocalIsoDate(from), to: toLocalIsoDate(to) };
}

export function todayIsoDate() {
  return toLocalIsoDate(new Date());
}

/** Локальная дата в ISO (YYYY-MM-DD) без сдвига таймзоны. */
export function toLocalIsoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
