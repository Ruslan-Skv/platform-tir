/** Сохранённые фильтры журнала ДП (/admin/dp). */
import type { MoneyMovementManagerOption } from '@/shared/api/crm/admin-money-movements';

import { monthBoundsIso } from './money-movements-page.constants';

/** «Мои» — только записи, где менеджером зафиксирован текущий пользователь. */
export type DpListScope = 'all' | 'mine';

export interface DpFiltersPersisted {
  scope: DpListScope;
  managerId: string;
  direction: string;
  paymentForm: string;
  search: string;
  dateFrom: string;
  dateTo: string;
  page: number;
}

const DP_FILTERS_STORAGE_KEY = 'admin_dp_money_movements_filters_v1';

const SCOPE_VALUES = new Set<DpListScope>(['all', 'mine']);
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Дефолт: текущий месяц, без ограничений по менеджеру и направлению. */
export function defaultDpFilters(): DpFiltersPersisted {
  const now = new Date();
  const bounds = monthBoundsIso(now.getFullYear(), now.getMonth());
  return {
    scope: 'all',
    managerId: '',
    direction: '',
    paymentForm: '',
    search: '',
    dateFrom: bounds.from,
    dateTo: bounds.to,
    page: 1,
  };
}

function normalizePersistedFilters(raw: unknown): DpFiltersPersisted {
  const defaults = defaultDpFilters();
  if (!raw || typeof raw !== 'object') return defaults;
  const value = raw as Partial<DpFiltersPersisted>;
  return {
    scope:
      typeof value.scope === 'string' && SCOPE_VALUES.has(value.scope as DpListScope)
        ? (value.scope as DpListScope)
        : defaults.scope,
    managerId: typeof value.managerId === 'string' ? value.managerId.trim() : '',
    direction: typeof value.direction === 'string' ? value.direction.trim() : '',
    paymentForm: typeof value.paymentForm === 'string' ? value.paymentForm.trim() : '',
    search: typeof value.search === 'string' ? value.search : '',
    dateFrom:
      typeof value.dateFrom === 'string' && ISO_DATE_RE.test(value.dateFrom)
        ? value.dateFrom
        : defaults.dateFrom,
    dateTo:
      typeof value.dateTo === 'string' && ISO_DATE_RE.test(value.dateTo)
        ? value.dateTo
        : defaults.dateTo,
    page:
      typeof value.page === 'number' && Number.isInteger(value.page) && value.page >= 1
        ? value.page
        : defaults.page,
  };
}

let memoryCache: DpFiltersPersisted | null = null;

export function loadDpFilters(): DpFiltersPersisted {
  if (memoryCache) return memoryCache;
  if (typeof window === 'undefined') return defaultDpFilters();
  try {
    const raw = localStorage.getItem(DP_FILTERS_STORAGE_KEY);
    memoryCache = raw ? normalizePersistedFilters(JSON.parse(raw)) : defaultDpFilters();
  } catch {
    memoryCache = defaultDpFilters();
  }
  return memoryCache;
}

export function persistDpFilters(state: DpFiltersPersisted): void {
  memoryCache = { ...state };
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DP_FILTERS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}

export type DpFiltersSummaryItem = { key: string; label: string };

function formatSummaryDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

/** Краткие подписи включённых фильтров для свёрнутой панели журнала ДП. */
export function buildDpFiltersSummary(params: {
  scope: DpListScope;
  direction: string;
  search: string;
  managerId: string;
  managers: MoneyMovementManagerOption[];
  paymentForm: string;
  paymentFormLabels: Record<string, string>;
  dateFrom: string;
  dateTo: string;
}): DpFiltersSummaryItem[] {
  const items: DpFiltersSummaryItem[] = [];
  items.push({ key: 'scope', label: `Записи: ${params.scope === 'mine' ? 'Мои' : 'Все'}` });

  if (params.direction) {
    items.push({ key: 'direction', label: `Направление: ${params.direction}` });
  }

  const searchTrim = params.search.trim();
  if (searchTrim) {
    items.push({ key: 'search', label: `Поиск: «${searchTrim}»` });
  }

  if (params.scope !== 'mine' && params.managerId) {
    const manager = params.managers.find((m) => m.id === params.managerId);
    items.push({ key: 'manager', label: `Менеджер: ${manager?.name ?? params.managerId}` });
  }

  if (params.paymentForm) {
    items.push({
      key: 'paymentForm',
      label: `Способ: ${params.paymentFormLabels[params.paymentForm] ?? params.paymentForm}`,
    });
  }

  if (params.dateFrom || params.dateTo) {
    const from = params.dateFrom ? formatSummaryDate(params.dateFrom) : '…';
    const to = params.dateTo ? formatSummaryDate(params.dateTo) : '…';
    items.push({ key: 'dates', label: `Даты: ${from} — ${to}` });
  }

  return items;
}
