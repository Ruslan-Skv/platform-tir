/** Сохранённые фильтры журнала ДП (/admin/dp). */
import type { MoneyMovementManagerOption } from '@/shared/api/crm/admin-money-movements';

import {
  DP_DEFAULT_PAGE_LIMIT,
  DP_PAGE_LIMIT_OPTIONS,
  type DpPageLimit,
  monthBoundsIso,
} from './money-movements-page.constants';

/** «Мои» — только записи, где менеджером зафиксирован текущий пользователь. */
export type DpListScope = 'all' | 'mine';

/** Тип записи журнала: «manual» — ручные проводки, «auto» — автоматические; пусто — все. */
export type DpEntryKind = '' | 'auto' | 'manual';

/** Режим панели итогов за период: по направлениям или по менеджерам. */
export type DpTotalsMode = 'direction' | 'manager';

export interface DpFiltersPersisted {
  scope: DpListScope;
  managerId: string;
  direction: string;
  paymentForm: string;
  entryKind: DpEntryKind;
  totalsMode: DpTotalsMode;
  search: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  /** Записей на странице (пагинация журнала). */
  pageLimit: DpPageLimit;
}

const DP_FILTERS_STORAGE_KEY = 'admin_dp_money_movements_filters_v1';

const SCOPE_VALUES = new Set<DpListScope>(['all', 'mine']);
const ENTRY_KIND_VALUES = new Set<DpEntryKind>(['', 'auto', 'manual']);
const TOTALS_MODE_VALUES = new Set<DpTotalsMode>(['direction', 'manager']);
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
    entryKind: '',
    totalsMode: 'direction',
    search: '',
    dateFrom: bounds.from,
    dateTo: bounds.to,
    page: 1,
    pageLimit: DP_DEFAULT_PAGE_LIMIT,
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
    entryKind:
      typeof value.entryKind === 'string' && ENTRY_KIND_VALUES.has(value.entryKind as DpEntryKind)
        ? (value.entryKind as DpEntryKind)
        : defaults.entryKind,
    totalsMode:
      typeof value.totalsMode === 'string' &&
      TOTALS_MODE_VALUES.has(value.totalsMode as DpTotalsMode)
        ? (value.totalsMode as DpTotalsMode)
        : defaults.totalsMode,
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
    pageLimit:
      typeof value.pageLimit === 'number' &&
      (DP_PAGE_LIMIT_OPTIONS as readonly number[]).includes(value.pageLimit)
        ? (value.pageLimit as DpPageLimit)
        : defaults.pageLimit,
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
  entryKind: DpEntryKind;
  totalsMode: DpTotalsMode;
  dateFrom: string;
  dateTo: string;
}): DpFiltersSummaryItem[] {
  const items: DpFiltersSummaryItem[] = [];
  items.push({ key: 'scope', label: `Записи: ${params.scope === 'mine' ? 'Мои' : 'Все'}` });

  if (params.direction) {
    items.push({ key: 'direction', label: `Направление: ${params.direction}` });
  }

  if (params.entryKind) {
    items.push({
      key: 'entryKind',
      label: `Тип: ${params.entryKind === 'manual' ? 'ручные' : 'авто'}`,
    });
  }

  if (params.totalsMode === 'manager') {
    items.push({ key: 'totalsMode', label: 'Итоги: по менеджерам' });
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
