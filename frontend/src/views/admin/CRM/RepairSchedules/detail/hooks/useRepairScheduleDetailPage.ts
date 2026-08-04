'use client';

import { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  type RepairScheduleEntryKind,
  type RepairScheduleProject,
  addRepairScheduleEntry,
  deleteRepairScheduleEntry,
  getRepairScheduleProject,
  setRepairScheduleProjectStatus,
} from '@/shared/api/crm/admin-repair-schedules';

import { todayIsoDate } from '../../shared/repair-schedules';

export function useRepairScheduleDetailPage(projectId: string) {
  const router = useRouter();
  const [project, setProject] = useState<RepairScheduleProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [entryDate, setEntryDate] = useState(todayIsoDate);
  const [entryKind, setEntryKind] = useState<RepairScheduleEntryKind>('WEEKLY');
  const [entryText, setEntryText] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setProject(await getRepairScheduleProject(projectId));
    } catch (err) {
      setProject(null);
      setMessage(err instanceof Error ? err.message : 'Не удалось загрузить проект');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addEntry = async () => {
    if (!entryText.trim()) {
      setMessage('Укажите текст записи');
      return false;
    }
    setSubmitting(true);
    try {
      setProject(
        await addRepairScheduleEntry(projectId, {
          date: entryDate,
          kind: entryKind,
          text: entryText.trim(),
        })
      );
      setEntryText('');
      return true;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Не удалось добавить запись');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const removeEntry = async (entryId: string) => {
    setSubmitting(true);
    try {
      setProject(await deleteRepairScheduleEntry(projectId, entryId));
      return true;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Не удалось удалить запись');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const moveStatus = async (status: 'NEW' | 'IN_PROGRESS' | 'CLOSED') => {
    setSubmitting(true);
    try {
      setProject(await setRepairScheduleProjectStatus(projectId, status));
      return true;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Не удалось сменить статус');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    project,
    loading,
    message,
    setMessage,
    submitting,
    entryDate,
    setEntryDate,
    entryKind,
    setEntryKind,
    entryText,
    setEntryText,
    refresh,
    addEntry,
    removeEntry,
    moveStatus,
    back: () => router.push('/admin/crm/repair-schedules'),
  };
}

export type RepairScheduleDetailPageModel = ReturnType<typeof useRepairScheduleDetailPage>;
