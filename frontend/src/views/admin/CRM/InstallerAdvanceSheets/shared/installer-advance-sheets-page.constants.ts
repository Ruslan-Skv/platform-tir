import type {
  InstallerAdvanceSheetItemStatus,
  InstallerAdvanceSheetStatus,
} from '@/shared/api/crm/admin-installer-advance-sheets';

/** Опции пагинации списка ведомостей — как в «Расчёте мастеров». */
export const IAS_PAGE_LIMIT_OPTIONS = [20, 50, 100, 200] as const;
export type IasPageLimit = (typeof IAS_PAGE_LIMIT_OPTIONS)[number];

/** Записей на странице по умолчанию. */
export const IAS_DEFAULT_PAGE_LIMIT: IasPageLimit = 50;

/** Фильтр списка по статусу ведомости. */
export const IAS_STATUS_OPTIONS: {
  value: InstallerAdvanceSheetStatus;
  label: string;
}[] = [
  { value: 'PENDING', label: 'Ожидают выплаты' },
  { value: 'QUESTION', label: 'Есть вопросы' },
  { value: 'PAID', label: 'Выплачены' },
];

/** Стадия договора (снимок на момент проводки). */
export const IAS_PACKAGE_STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'В работе',
  CONTRACT_CONCLUDED: 'Договор заключён',
  REFUSED: 'Отказ',
};

export const IAS_ITEM_STATUS_LABELS: Record<InstallerAdvanceSheetItemStatus, string> = {
  PENDING: 'Ожидает выплаты',
  QUESTION: 'Есть вопрос',
  PAID: 'Выплачено',
};

/** Роли, которым бэкенд разрешает создавать/редактировать ведомости. */
export const IAS_SHEET_AUTHOR_ROLES = [
  'SUPER_ADMIN',
  'BRIGADIER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
] as const;

export function isIasSheetAuthor(role: string | undefined | null): boolean {
  return !!role && (IAS_SHEET_AUTHOR_ROLES as readonly string[]).includes(role);
}

export function formatIasDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU');
}

export function formatIasDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Сумма: копейки показываем только когда есть (авансы бывают с ними). */
export function formatIasMoney(value: string | number | null | undefined) {
  if (value == null) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

/** Разряд мастера («6» → «6р»). */
export function formatIasGradeShort(rawGrade: string | null | undefined): string {
  if (!rawGrade) return '';
  const match = rawGrade.match(/\d+/);
  const rank = match ? Number.parseInt(match[0] ?? '', 10) : NaN;
  if (!Number.isFinite(rank)) return rawGrade.trim() || '';
  return `${rank}р`;
}

/** Локальная дата в ISO (YYYY-MM-DD) без сдвига таймзоны. */
export function toLocalIsoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayIsoDate() {
  return toLocalIsoDate(new Date());
}

/** «5 ведомостей / 1 ведомость / 22 ведомости». */
export function formatIasCountLabel(total: number): string {
  const mod10 = total % 10;
  const mod100 = total % 100;
  let word = 'ведомостей';
  if (mod10 === 1 && mod100 !== 11) word = 'ведомость';
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = 'ведомости';
  return `${total} ${word}`;
}
