'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/features/auth';
import { getOffices } from '@/shared/api/admin-crm';
import { type WorkDayRecord, deleteWorkDay, getWorkDays } from '@/shared/api/admin-work-days';

export function useWorkDaysPage() {
  const { user } = useAuth();
  const canDelete = user?.role === 'SUPER_ADMIN';
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const defaultTo = today.toISOString().slice(0, 10);

  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [officeId, setOfficeId] = useState('');
  const [rows, setRows] = useState<WorkDayRecord[]>([]);
  const [offices, setOffices] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getWorkDays({
        dateFrom,
        dateTo,
        officeId: officeId || undefined,
      });
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, officeId]);

  useEffect(() => {
    void getOffices(true)
      .then(setOffices)
      .catch(() => {});
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = useCallback(
    async (row: WorkDayRecord) => {
      if (!canDelete) return;
      setDeletingId(row.id);
      setError(null);
      try {
        await deleteWorkDay(row.id);
        setRows((prev) => prev.filter((item) => item.id !== row.id));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось удалить запись');
      } finally {
        setDeletingId(null);
      }
    },
    [canDelete]
  );

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
    deletingId,
    canDelete,
    error,
    stats,
    load,
    handleDelete,
  };
}

export type WorkDaysPageModel = ReturnType<typeof useWorkDaysPage>;
