'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

/** Опции пагинации списков план-графиков CRM — как в журнале ДП (30/50/100 записей). */
export const ADMIN_LIST_PAGE_LIMIT_OPTIONS = [30, 50, 100] as const;
export type AdminListPageLimit = (typeof ADMIN_LIST_PAGE_LIMIT_OPTIONS)[number];

/** Записей на странице по умолчанию. */
export const ADMIN_LIST_DEFAULT_PAGE_LIMIT: AdminListPageLimit = 30;

type StoredPagination = {
  page: number;
  pageLimit: AdminListPageLimit;
};

function readStoredPagination(storageKey: string): StoredPagination {
  const fallback: StoredPagination = { page: 1, pageLimit: ADMIN_LIST_DEFAULT_PAGE_LIMIT };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<StoredPagination>;
    const page = Number(parsed.page);
    const pageLimit = Number(parsed.pageLimit);
    return {
      page: Number.isInteger(page) && page >= 1 ? page : fallback.page,
      pageLimit: (ADMIN_LIST_PAGE_LIMIT_OPTIONS as readonly number[]).includes(pageLimit)
        ? (pageLimit as AdminListPageLimit)
        : fallback.pageLimit,
    };
  } catch {
    return fallback;
  }
}

/**
 * Клиентская пагинация списка план-графиков (ОДПЖ / ремонт / мебель): срез
 * отфильтрованных записей под выбранное число на странице. Страница и размер
 * страницы сохраняются в localStorage по ключу страницы; смена размера
 * возвращает на первую страницу. Смена фильтров — забота вызывающего хука
 * (сбрасывает страницу через setPage(1)).
 */
export function useAdminListPagination<T>(
  items: T[],
  options: { loading: boolean; storageKey: string }
) {
  const { loading, storageKey } = options;
  const [stored] = useState(() => readStoredPagination(storageKey));
  /** Номер страницы списка — сохраняется между визитами. */
  const [page, setPage] = useState(stored.page);
  /** Записей на странице — выбор пользователя, сохраняется между визитами. */
  const [limit, setLimitState] = useState<AdminListPageLimit>(stored.pageLimit);

  /** Страница списка: срез записей под выбранное число на странице. */
  const pagedItems = useMemo(() => {
    const start = (page - 1) * limit;
    return items.slice(start, start + limit);
  }, [items, page, limit]);

  // После смены фильтров/размера страницы текущая страница может стать лишней —
  // возвращаем на последнюю существующую (во время загрузки список пуст — не трогаем).
  const totalPages = Math.max(1, Math.ceil(items.length / limit));
  useEffect(() => {
    if (loading || page <= totalPages) return;
    setPage(totalPages);
  }, [loading, page, totalPages]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ page, pageLimit: limit }));
    } catch {
      /* ignore */
    }
  }, [storageKey, page, limit]);

  /** Смена размера страницы возвращает на первую страницу. */
  const setLimit = useCallback((value: AdminListPageLimit) => {
    setLimitState(value);
    setPage(1);
  }, []);

  return { page, setPage, limit, setLimit, pagedItems };
}
