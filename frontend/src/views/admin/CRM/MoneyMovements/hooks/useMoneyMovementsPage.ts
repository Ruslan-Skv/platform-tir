'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  type MoneyMovement,
  type MoneyMovementManagerOption,
  getMoneyMovements,
} from '@/shared/api/crm/admin-money-movements';

import {
  MONEY_MOVEMENTS_PAGE_SIZE,
  monthBoundsIso,
  toLocalIsoDate,
  todayIsoDate,
} from '../money-movements-page.constants';

const SEARCH_DEBOUNCE_MS = 400;

function defaultPeriod() {
  const now = new Date();
  const bounds = monthBoundsIso(now.getFullYear(), now.getMonth());
  return { dateFrom: bounds.from, dateTo: bounds.to };
}

export function useMoneyMovementsPage() {
  const period = defaultPeriod();
  const [dateFrom, setDateFrom] = useState(period.dateFrom);
  const [dateTo, setDateTo] = useState(period.dateTo);
  const [managerId, setManagerId] = useState('');
  const [direction, setDirection] = useState('');
  const [paymentForm, setPaymentForm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<MoneyMovement[]>([]);
  const [managers, setManagers] = useState<MoneyMovementManagerOption[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSum, setTotalSum] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // Отдельный дебаунс для поиска: не дёргаем API на каждый символ
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
      const response = await getMoneyMovements({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        managerId: managerId || undefined,
        direction: direction || undefined,
        paymentForm: paymentForm || undefined,
        search: search || undefined,
        page,
        limit: MONEY_MOVEMENTS_PAGE_SIZE,
      });
      setItems(response.data);
      setManagers(response.managers);
      setTotal(response.total);
      setTotalPages(response.totalPages);
      setTotalSum(response.totalSum);
    } catch (error) {
      setItems([]);
      setManagers([]);
      setTotal(0);
      setTotalPages(1);
      setTotalSum(0);
      setMessage(error instanceof Error ? error.message : 'Не удалось загрузить журнал ДП');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, managerId, direction, paymentForm, search, page]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const resetFilters = useCallback(() => {
    const fresh = defaultPeriod();
    setDateFrom(fresh.dateFrom);
    setDateTo(fresh.dateTo);
    setManagerId('');
    setDirection('');
    setPaymentForm('');
    setSearchInput('');
    setPage(1);
  }, []);

  const setPeriod = useCallback((kind: 'today' | 'week' | 'month') => {
    const today = todayIsoDate();
    if (kind === 'today') {
      setDateFrom(today);
      setDateTo(today);
    } else if (kind === 'week') {
      const base = new Date(`${today}T00:00:00`);
      const to = new Date(base);
      to.setDate(to.getDate() + 6);
      setDateFrom(today);
      setDateTo(toLocalIsoDate(to));
    } else {
      const now = new Date();
      const bounds = monthBoundsIso(now.getFullYear(), now.getMonth());
      setDateFrom(bounds.from);
      setDateTo(bounds.to);
    }
    setPage(1);
  }, []);

  return {
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
    managerId,
    setManagerId: (value: string) => {
      setManagerId(value);
      setPage(1);
    },
    direction,
    setDirection: (value: string) => {
      setDirection(value);
      setPage(1);
    },
    paymentForm,
    setPaymentForm: (value: string) => {
      setPaymentForm(value);
      setPage(1);
    },
    searchInput,
    setSearchInput,
    page,
    setPage,
    items,
    managers,
    total,
    totalPages,
    totalSum,
    loading,
    message,
    setMessage,
    refresh,
    resetFilters,
    setPeriod,
  };
}

export type MoneyMovementsPageModel = ReturnType<typeof useMoneyMovementsPage>;
