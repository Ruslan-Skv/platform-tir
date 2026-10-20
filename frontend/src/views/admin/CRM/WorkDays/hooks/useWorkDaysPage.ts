'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/features/auth';
import { getOffices } from '@/shared/api/admin-crm';
import {
  type WorkDayExcuse,
  type WorkDayExcuseKind,
  type WorkDayJournalRow,
  type WorkDayLeave,
  type WorkDayUserSchedule,
  createWorkDayExcuse,
  createWorkDayLeave,
  deleteWorkDay,
  deleteWorkDayExcuse,
  deleteWorkDayLeave,
  getWorkDayExcuses,
  getWorkDayLeaves,
  getWorkDayUsers,
  getWorkDays,
} from '@/shared/api/crm/admin-work-days';

import { hasWorkDayExcuse, isWorkDaySyntheticRow } from '../work-days-display.utils';

export function useWorkDaysPage() {
  const { user } = useAuth();
  const canDelete = user?.role === 'SUPER_ADMIN';
  const canManageLeaves = canDelete;
  const canManageExcuses = canDelete;
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
  const [excuses, setExcuses] = useState<WorkDayExcuse[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingLeave, setSavingLeave] = useState(false);
  const [deletingLeaveId, setDeletingLeaveId] = useState<string | null>(null);
  const [savingExcuse, setSavingExcuse] = useState(false);
  const [deletingExcuseId, setDeletingExcuseId] = useState<string | null>(null);
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

  const loadExcuses = useCallback(async () => {
    if (!canManageExcuses) return;
    try {
      setExcuses(await getWorkDayExcuses({ dateFrom, dateTo, officeId: officeId || undefined }));
    } catch {
      setExcuses([]);
    }
  }, [canManageExcuses, dateFrom, dateTo, officeId]);

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

  useEffect(() => {
    void loadExcuses();
  }, [loadExcuses]);

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

  const handleCreateExcuse = useCallback(
    async (payload: {
      userId: string;
      workDate: string;
      kinds: WorkDayExcuseKind[];
      comment?: string;
    }) => {
      setSavingExcuse(true);
      setError(null);
      try {
        await createWorkDayExcuse(payload);
        await Promise.all([load(), loadExcuses()]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось простить нарушение');
        throw e;
      } finally {
        setSavingExcuse(false);
      }
    },
    [load, loadExcuses]
  );

  const handleDeleteExcuse = useCallback(
    async (excuseId: string) => {
      setDeletingExcuseId(excuseId);
      setError(null);
      try {
        await deleteWorkDayExcuse(excuseId);
        await Promise.all([load(), loadExcuses()]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось отменить прощение');
      } finally {
        setDeletingExcuseId(null);
      }
    },
    [load, loadExcuses]
  );

  const stats = useMemo(() => {
    const days = rows.filter((r) => !isWorkDaySyntheticRow(r));
    // Прощённые нарушения не считаются нарушениями — в счётчики не входят.
    const late = days.filter((r) => r.lateMinutes > 0 && !hasWorkDayExcuse(r, 'LATE')).length;
    const early = days.filter(
      (r) => r.earlyLeaveMinutes > 0 && !hasWorkDayExcuse(r, 'EARLY_LEAVE')
    ).length;
    const auto = days.filter(
      (r) => r.status === 'AUTO_CLOSED' && !hasWorkDayExcuse(r, 'AUTO_CLOSE')
    ).length;
    const dayOffs = rows.filter((r) => r.dayOffOnly === true && r.bySchedule !== true).length;
    const dayOffsBySchedule = rows.filter(
      (r) => r.dayOffOnly === true && r.bySchedule === true
    ).length;
    const truancy = rows.filter(
      (r) => r.truancyOnly === true && !hasWorkDayExcuse(r, 'TRUANCY')
    ).length;
    const vacation = rows.filter((r) => r.leaveOnly === true && r.leaveType === 'VACATION').length;
    const sick = rows.filter((r) => r.leaveOnly === true && r.leaveType === 'SICK').length;
    const dayOffWork = days.filter((r) => r.isDayOffWork).length;
    const excused = rows.reduce((sum, r) => sum + (r.excuses?.length ?? 0), 0);
    return {
      late,
      early,
      auto,
      dayOffs,
      dayOffsBySchedule,
      truancy,
      dayOffWork,
      vacation,
      sick,
      excused,
    };
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
    excuses,
    loading,
    deletingId,
    canDelete,
    canManageLeaves,
    canManageExcuses,
    savingLeave,
    deletingLeaveId,
    savingExcuse,
    deletingExcuseId,
    error,
    stats,
    load,
    handleDelete,
    handleCreateLeave,
    handleDeleteLeave,
    handleCreateExcuse,
    handleDeleteExcuse,
  };
}

export type WorkDaysPageModel = ReturnType<typeof useWorkDaysPage>;
