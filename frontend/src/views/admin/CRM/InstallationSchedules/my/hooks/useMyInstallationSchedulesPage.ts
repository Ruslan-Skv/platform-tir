'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type InstallationSchedule,
  completeInstallationSchedule,
  failInstallationSchedule,
  getMyInstallationSchedules,
} from '@/shared/api/crm/admin-installation-schedules';

import { todayIsoDate, weekAheadIsoDate } from '../../shared/installation-schedules';

export type InstallationStatusFilter = 'ALL' | 'PLANNED' | 'DONE' | 'FAILED';

export type MyInstallationSchedulesPageMessage = {
  type: 'success' | 'error';
  text: string;
};

export function useMyInstallationSchedulesPage() {
  const [dateFrom, setDateFrom] = useState(todayIsoDate);
  const [dateTo, setDateTo] = useState(() => weekAheadIsoDate());
  const [items, setItems] = useState<InstallationSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<InstallationStatusFilter>('ALL');
  const [message, setMessage] = useState<MyInstallationSchedulesPageMessage | null>(null);
  const [failItem, setFailItem] = useState<InstallationSchedule | null>(null);
  const [failNote, setFailNote] = useState('');
  const [completeItem, setCompleteItem] = useState<InstallationSchedule | null>(null);
  const [completeNote, setCompleteNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyInstallationSchedules({ dateFrom, dateTo });
      setItems(data);
    } catch (err) {
      setItems([]);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Не удалось загрузить монтажи',
      });
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const filtered = useMemo(() => {
    if (statusFilter === 'ALL') return items;
    return items.filter((t) => t.status === statusFilter);
  }, [items, statusFilter]);

  const openCompleteModal = useCallback((item: InstallationSchedule) => {
    setCompleteNote('');
    setCompleteItem(item);
  }, []);

  const handleCompleteConfirm = useCallback(async () => {
    if (!completeItem) return;
    setSubmitting(true);
    try {
      await completeInstallationSchedule(completeItem.id, completeNote.trim() || null);
      setMessage({ type: 'success', text: 'Монтаж выполнен' });
      setCompleteItem(null);
      setCompleteNote('');
      await loadItems();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Не удалось отметить',
      });
    } finally {
      setSubmitting(false);
    }
  }, [completeItem, completeNote, loadItems]);

  const handleFailConfirm = useCallback(async () => {
    if (!failItem) return;
    if (!failNote.trim()) {
      setMessage({ type: 'error', text: 'Укажите причину невыполнения' });
      return;
    }
    setSubmitting(true);
    try {
      await failInstallationSchedule(failItem.id, failNote.trim());
      setMessage({ type: 'success', text: 'Отмечено как не выполнено' });
      setFailItem(null);
      setFailNote('');
      await loadItems();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Не удалось отметить',
      });
    } finally {
      setSubmitting(false);
    }
  }, [failItem, failNote, loadItems]);

  return {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    items,
    filtered,
    loading,
    statusFilter,
    setStatusFilter,
    message,
    failItem,
    setFailItem,
    failNote,
    setFailNote,
    completeItem,
    setCompleteItem,
    completeNote,
    setCompleteNote,
    submitting,
    openCompleteModal,
    handleCompleteConfirm,
    handleFailConfirm,
    refresh: loadItems,
  };
}

export type MyInstallationSchedulesPageModel = ReturnType<typeof useMyInstallationSchedulesPage>;
