'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth/context/AuthContext';
import type { InstallerMaster } from '@/shared/api/admin-crm';
import { getInstallers } from '@/shared/api/admin-crm';
import {
  type InstallerAdvanceSheetStatus,
  type InstallerAdvanceSheetSummary,
  getInstallerAdvanceSheets,
} from '@/shared/api/crm/admin-installer-advance-sheets';

import {
  IAS_DEFAULT_PAGE_LIMIT,
  type IasPageLimit,
  isIasSheetAuthor,
} from '../shared/installer-advance-sheets-page.constants';

const SEARCH_DEBOUNCE_MS = 400;

export function useInstallerAdvanceSheetsPage() {
  const { user } = useAuth();
  /** Ведомости создают ВС / бригадиры (+ супер-админ); выплаты — только супер-админ. */
  const canCreateSheets = isIasSheetAuthor(user?.role);
  const canManagePayments = user?.role === 'SUPER_ADMIN';

  const [status, setStatus] = useState<InstallerAdvanceSheetStatus | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [installerId, setInstallerId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimitState] = useState<IasPageLimit>(IAS_DEFAULT_PAGE_LIMIT);

  const [items, setItems] = useState<InstallerAdvanceSheetSummary[]>([]);
  const [installers, setInstallers] = useState<InstallerMaster[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // Справочник мастеров для фильтра — загружаем один раз.
  useEffect(() => {
    let cancelled = false;
    getInstallers()
      .then((registry) => {
        if (!cancelled) setInstallers(registry);
      })
      .catch(() => {
        // фильтр останется пустым — не критично
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Отдельный дебаунс для поиска: не дёргаем API на каждый символ.
  const searchTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    searchTimerRef.current = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    };
  }, [searchInput]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getInstallerAdvanceSheets({
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        installerId: installerId || undefined,
        search: search || undefined,
        page,
        limit,
      });
      setItems(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (error) {
      setItems([]);
      setTotal(0);
      setTotalPages(1);
      setMessage(error instanceof Error ? error.message : 'Не удалось загрузить ведомости');
    } finally {
      setLoading(false);
    }
  }, [status, dateFrom, dateTo, installerId, search, page, limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // После смены фильтров текущая страница может стать лишней — возвращаем на последнюю.
  useEffect(() => {
    if (loading || totalPages === 0 || page <= totalPages) return;
    setPage(totalPages);
  }, [loading, totalPages, page]);

  const resetFilters = useCallback(() => {
    setStatus('');
    setDateFrom('');
    setDateTo('');
    setInstallerId('');
    setSearchInput('');
    setLimitState(IAS_DEFAULT_PAGE_LIMIT);
    setPage(1);
  }, []);

  return {
    status,
    setStatus: (value: InstallerAdvanceSheetStatus | '') => {
      setStatus(value);
      setPage(1);
    },
    dateFrom,
    setDateFrom: (value: string) => {
      setDateFrom(value);
      setPage(1);
    },
    dateTo,
    setDateTo: (value: string) => {
      setDateTo(value);
      setPage(1);
    },
    installerId,
    setInstallerId: (value: string) => {
      setInstallerId(value);
      setPage(1);
    },
    searchInput,
    setSearchInput,
    page,
    setPage,
    limit,
    setLimit: (value: IasPageLimit) => {
      setLimitState(value);
      setPage(1);
    },
    items,
    installers,
    total,
    totalPages,
    loading,
    message,
    setMessage,
    refresh,
    resetFilters,
    canCreateSheets,
    canManagePayments,
  };
}

export type InstallerAdvanceSheetsPageModel = ReturnType<typeof useInstallerAdvanceSheetsPage>;
