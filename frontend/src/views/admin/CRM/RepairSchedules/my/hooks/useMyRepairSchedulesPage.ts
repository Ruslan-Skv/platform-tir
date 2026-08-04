'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  type RepairScheduleProject,
  type RepairScheduleProjectStatus,
  addRepairScheduleEntry,
  getMyRepairScheduleProjects,
} from '@/shared/api/crm/admin-repair-schedules';

import { todayIsoDate } from '../../shared/repair-schedules';

export function useMyRepairSchedulesPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<RepairScheduleProjectStatus | 'ALL'>(
    'IN_PROGRESS'
  );
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<RepairScheduleProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [entryProject, setEntryProject] = useState<RepairScheduleProject | null>(null);
  const [entryDate, setEntryDate] = useState(todayIsoDate);
  const [entryText, setEntryText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getMyRepairScheduleProjects({ search: search.trim() || undefined }));
    } catch (err) {
      setItems([]);
      setMessage(err instanceof Error ? err.message : 'Не удалось загрузить ремонты');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visibleItems = useMemo(() => {
    if (statusFilter === 'ALL') return items;
    return items.filter((i) => i.status === statusFilter);
  }, [items, statusFilter]);

  const statusCounts = useMemo(
    () => ({
      ALL: items.length,
      NEW: items.filter((i) => i.status === 'NEW').length,
      IN_PROGRESS: items.filter((i) => i.status === 'IN_PROGRESS').length,
      CLOSED: items.filter((i) => i.status === 'CLOSED').length,
      STALE: items.filter((i) => i.stale).length,
    }),
    [items]
  );

  const openEntry = (project: RepairScheduleProject) => {
    setEntryProject(project);
    setEntryDate(todayIsoDate());
    setEntryText('');
  };

  const submitEntry = async () => {
    if (!entryProject) return false;
    if (!entryText.trim()) {
      setMessage('Укажите текст записи');
      return false;
    }
    setSubmitting(true);
    try {
      await addRepairScheduleEntry(entryProject.id, {
        date: entryDate,
        kind: 'WEEKLY',
        text: entryText.trim(),
      });
      setEntryProject(null);
      await refresh();
      return true;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Не удалось добавить запись');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    items: visibleItems,
    allCount: items.length,
    loading,
    message,
    setMessage,
    statusCounts,
    entryProject,
    setEntryProject,
    entryDate,
    setEntryDate,
    entryText,
    setEntryText,
    submitting,
    refresh,
    openEntry,
    submitEntry,
    openProject: (id: string) => router.push(`/admin/crm/repair-schedules/${id}`),
  };
}

export type MyRepairSchedulesPageModel = ReturnType<typeof useMyRepairSchedulesPage>;
