/** Сохранённые фильтры раздела «Расчёт мастеров» (/admin/installer-settlements). */
import type { InstallerSettlementOption } from '@/shared/api/crm/admin-installer-settlements';

import {
  IS_DEFAULT_PAGE_LIMIT,
  IS_PAGE_LIMIT_OPTIONS,
  type IsPageLimit,
  monthBoundsIso,
} from './installer-settlements-page.constants';

export interface IsFiltersPersisted {
  installerId: string;
  direction: string;
  search: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  /** Записей на странице (пагинация журнала выплат). */
  pageLimit: IsPageLimit;
}

const IS_FILTERS_STORAGE_KEY = 'admin_installer_settlements_filters_v1';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Дефолт: текущий месяц, все мастера и направления. */
export function defaultIsFilters(): IsFiltersPersisted {
  const now = new Date();
  const bounds = monthBoundsIso(now.getFullYear(), now.getMonth());
  return {
    installerId: '',
    direction: '',
    search: '',
    dateFrom: bounds.from,
    dateTo: bounds.to,
    page: 1,
    pageLimit: IS_DEFAULT_PAGE_LIMIT,
  };
}

function normalizePersistedFilters(raw: unknown): IsFiltersPersisted {
  const defaults = defaultIsFilters();
  if (!raw || typeof raw !== 'object') return defaults;
  const value = raw as Partial<IsFiltersPersisted>;
  return {
    installerId: typeof value.installerId === 'string' ? value.installerId.trim() : '',
    direction: typeof value.direction === 'string' ? value.direction.trim() : '',
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
      (IS_PAGE_LIMIT_OPTIONS as readonly number[]).includes(value.pageLimit)
        ? (value.pageLimit as IsPageLimit)
        : defaults.pageLimit,
  };
}

let memoryCache: IsFiltersPersisted | null = null;

export function loadIsFilters(): IsFiltersPersisted {
  if (memoryCache) return memoryCache;
  if (typeof window === 'undefined') return defaultIsFilters();
  try {
    const raw = localStorage.getItem(IS_FILTERS_STORAGE_KEY);
    memoryCache = raw ? normalizePersistedFilters(JSON.parse(raw)) : defaultIsFilters();
  } catch {
    memoryCache = defaultIsFilters();
  }
  return memoryCache;
}

export function persistIsFilters(state: IsFiltersPersisted): void {
  memoryCache = { ...state };
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(IS_FILTERS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}

export type IsFiltersSummaryItem = { key: string; label: string };

function formatSummaryDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

/** Краткие подписи включённых фильтров для свёрнутой панели. */
export function buildIsFiltersSummary(params: {
  direction: string;
  search: string;
  installerId: string;
  installers: InstallerSettlementOption[];
  dateFrom: string;
  dateTo: string;
}): IsFiltersSummaryItem[] {
  const items: IsFiltersSummaryItem[] = [];

  if (params.direction) {
    items.push({ key: 'direction', label: `Направление: ${params.direction}` });
  }

  const searchTrim = params.search.trim();
  if (searchTrim) {
    items.push({ key: 'search', label: `Поиск: «${searchTrim}»` });
  }

  if (params.installerId) {
    const installer = params.installers.find((i) => i.id === params.installerId);
    items.push({ key: 'installer', label: `Мастер: ${installer?.name ?? params.installerId}` });
  }

  if (params.dateFrom || params.dateTo) {
    const from = params.dateFrom ? formatSummaryDate(params.dateFrom) : '…';
    const to = params.dateTo ? formatSummaryDate(params.dateTo) : '…';
    items.push({ key: 'dates', label: `Даты: ${from} — ${to}` });
  }

  return items;
}
