'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/features/auth';
import { getOffices } from '@/shared/api/admin-crm';
import {
  type WorkDayJournalRow,
  type WorkDayLeave,
  type WorkDayUserSchedule,
  createWorkDayLeave,
  deleteWorkDay,
  deleteWorkDayLeave,
  getWorkDayLeaves,
  getWorkDayUsers,
  getWorkDays,
} from '@/shared/api/admin-work-days';

import { isWorkDaySyntheticRow } from '../work-days-display.utils';

export function useWorkDaysPage() {
  const { user } = useAuth();
  const canDelete = user?.role === 'SUPER_ADMIN';
  const canManageLeaves = canDelete;
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const defaultTo = today.toISOString().slice(0, 10);

  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [officeId, setOfficeId] = useState('');
  const [rows, setRows] = useState<WorkDayJournalRow[]>([]);
  const [offices, setOffices] = useState<{ id: string; name: string }[]>([]);
  const [trackedUsers, setTrackedUsers] = useState<WorkDayUserSchedule[]>([]);
  const [leaves, setLeaves] = useState<WorkDayLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingLeave, setSavingLeave] = useState(false);
  const [deletingLeaveId, setDeletingLeaveId] = useState<string | null>(null);
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

  const loadLeaves = useCallback(async () => {
    if (!canManageLeaves) return;
    try {
      setLeaves(await getWorkDayLeaves({ dateFrom, dateTo, officeId: officeId || undefined }));
    } catch {
      setLeaves([]);
    }
  }, [canManageLeaves, dateFrom, dateTo, officeId]);

  useEffect(() => {
    void getOffices(true)
      .then(setOffices)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!canManageLeaves) return;
    void getWorkDayUsers()
      .then(setTrackedUsers)
      .catch(() => {});
  }, [canManageLeaves]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadLeaves();
  }, [loadLeaves]);

  const handleDelete = useCallback(
    async (row: WorkDayJournalRow) => {
      if (!canDelete) return;
      if (isWorkDaySyntheticRow(row)) return;
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

  const handleCreateLeave = useCallback(
    async (payload: {
      userId: string;
      type: 'VACATION' | 'SICK';
      dateFrom: string;
      dateTo: string;
      comment?: string;
    }) => {
      setSavingLeave(true);
      setError(null);
      try {
        await createWorkDayLeave(payload);
        await Promise.all([load(), loadLeaves()]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось отметить отпуск/больничный');
        throw e;
      } finally {
        setSavingLeave(false);
      }
    },
    [load, loadLeaves]
  );

  const handleDeleteLeave = useCallback(
    async (leaveId: string) => {
      setDeletingLeaveId(leaveId);
      setError(null);
      try {
        await deleteWorkDayLeave(leaveId);
        await Promise.all([load(), loadLeaves()]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось удалить отметку');
      } finally {
        setDeletingLeaveId(null);
      }
    },
    [load, loadLeaves]
  );

  const stats = useMemo(() => {
    const days = rows.filter((r) => !isWorkDaySyntheticRow(r));
    const late = days.filter((r) => r.lateMinutes > 0).length;
    const early = days.filter((r) => r.earlyLeaveMinutes > 0).length;
    const auto = days.filter((r) => r.status === 'AUTO_CLOSED').length;
    const dayOffs = rows.filter((r) => r.dayOffOnly === true && r.bySchedule !== true).length;
    const dayOffsBySchedule = rows.filter(
      (r) => r.dayOffOnly === true && r.bySchedule === true
    ).length;
    const truancy = rows.filter((r) => r.truancyOnly === true).length;
    const vacation = rows.filter((r) => r.leaveOnly === true && r.leaveType === 'VACATION').length;
    const sick = rows.filter((r) => r.leaveOnly === true && r.leaveType === 'SICK').length;
    const dayOffWork = days.filter((r) => r.isDayOffWork).length;
    return { late, early, auto, dayOffs, dayOffsBySchedule, truancy, dayOffWork, vacation, sick };
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
    trackedUsers,
    leaves,
    loading,
    deletingId,
    canDelete,
    canManageLeaves,
    savingLeave,
    deletingLeaveId,
    error,
    stats,
    load,
    handleDelete,
    handleCreateLeave,
    handleDeleteLeave,
  };
}

export type WorkDaysPageModel = ReturnType<typeof useWorkDaysPage>;
