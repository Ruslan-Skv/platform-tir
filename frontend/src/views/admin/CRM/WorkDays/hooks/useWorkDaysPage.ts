'use client';

import { useEffect, useMemo, useState } from 'react';

import { getOffices } from '@/shared/api/admin-crm';
import { type WorkDayRecord, getWorkDays } from '@/shared/api/admin-work-days';

export function useWorkDaysPage() {
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const defaultTo = today.toISOString().slice(0, 10);

  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [officeId, setOfficeId] = useState('');
  const [rows, setRows] = useState<WorkDayRecord[]>([]);
  const [offices, setOffices] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getOffices(true)
      .then(setOffices)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void getWorkDays({
      dateFrom,
      dateTo,
      officeId: officeId || undefined,
    })
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка'))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo, officeId]);

  const stats = useMemo(() => {
    const late = rows.filter((r) => r.lateMinutes > 0).length;
    const early = rows.filter((r) => r.earlyLeaveMinutes > 0).length;
    const auto = rows.filter((r) => r.status === 'AUTO_CLOSED').length;
    return { late, early, auto };
  }, [rows]);

  return {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    officeId,
    setOfficeId,
    rows,
    offices,
    loading,
    error,
    stats,
  };
}

export type WorkDaysPageModel = ReturnType<typeof useWorkDaysPage>;
