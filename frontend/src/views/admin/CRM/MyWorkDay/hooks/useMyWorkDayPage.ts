'use client';

import { useEffect, useState } from 'react';

import { useWorkDay } from '@/features/admin/work-day';
import { type MyWorkDayHistoryResponse, getMyWorkDayHistory } from '@/shared/api/admin-work-days';

export function useMyWorkDayPage() {
  const { status: liveStatus } = useWorkDay();
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const defaultTo = today.toISOString().slice(0, 10);

  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [data, setData] = useState<MyWorkDayHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void getMyWorkDayHistory({ dateFrom, dateTo })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка'))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  return {
    liveStatus,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    rows: data?.records ?? [],
    stats: data?.summary ?? null,
    loading,
    error,
  };
}

export type MyWorkDayPageModel = ReturnType<typeof useMyWorkDayPage>;
