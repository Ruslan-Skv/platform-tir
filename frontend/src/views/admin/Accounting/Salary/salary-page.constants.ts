/** Утилиты и словари раздела «Расчёт з/п». */

// ===== Даты =====

/** Локальная дата в ISO (YYYY-MM-DD) без сдвига таймзоны. */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Первый день текущего месяца. */
export function monthStartIso(date = new Date()): string {
  return toIsoDate(new Date(date.getFullYear(), date.getMonth(), 1));
}

/** Последний день текущего месяца. */
export function monthEndIso(date = new Date()): string {
  return toIsoDate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

/** Первый день предыдущего месяца. */
export function prevMonthStartIso(date = new Date()): string {
  return toIsoDate(new Date(date.getFullYear(), date.getMonth() - 1, 1));
}

/** Последний день предыдущего месяца. */
export function prevMonthEndIso(date = new Date()): string {
  return toIsoDate(new Date(date.getFullYear(), date.getMonth(), 0));
}

// ===== Форматирование =====

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

const moneyFormat = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const moneyShortFormat = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return moneyFormat.format(value);
}

export function formatMoneyShort(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return moneyShortFormat.format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}%`;
}

/** Парсинг числа из поля ввода: запятая как разделитель, пустая строка → null. */
export function parseDecimal(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// ===== Склонения =====

export function pluralContracts(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'договор';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'договора';
  return 'договоров';
}

export function pluralSettlements(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'ведомость';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'ведомости';
  return 'ведомостей';
}

export function pluralCategories(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'категория';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'категории';
  return 'категорий';
}

// ===== Словари =====

/** Роли, доступные в правилах ставок категорий (как в бекенде SalaryRole). */
export const SALARY_ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'MANAGER', label: 'Менеджер' },
  { value: 'SURVEYOR', label: 'Замерщик' },
  { value: 'LEAD_SPECIALIST', label: 'Ведущий специалист (ВС)' },
  { value: 'BRIGADIER', label: 'Бригадир / бригада' },
];

/** Роли CRM, из которых выбирается менеджер договора. */
export const CONTRACT_MANAGER_ROLES = ['MANAGER', 'ADMIN', 'SUPER_ADMIN', 'TRAINEE'] as const;

/** Роли CRM, из которых выбирается замерщик договора. */
export const CONTRACT_SURVEYOR_ROLES = [
  'SURVEYOR',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
  'LEAD_SPECIALIST_FURNITURE',
  'BRIGADIER',
] as const;

export const SALARY_PAGE_LIMIT_OPTIONS = [20, 50, 100, 200] as const;
export type SalaryPageLimit = (typeof SALARY_PAGE_LIMIT_OPTIONS)[number];
