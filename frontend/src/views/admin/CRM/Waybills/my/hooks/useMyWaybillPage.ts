'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type WaybillTask,
  completeWaybillTask,
  failWaybillTask,
  getMyWaybillTasks,
} from '@/shared/api/admin-waybills';

import type { WaybillsPageMessage } from '../../shared/waybills-page.types';
import { todayIsoDate } from '../../shared/waybills-page.utils';

export function useMyWaybillPage() {
  const [date, setDate] = useState(todayIsoDate);
  const [tasks, setTasks] = useState<WaybillTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<WaybillsPageMessage | null>(null);
  const [failItem, setFailItem] = useState<WaybillTask | null>(null);
  const [failNote, setFailNote] = useState('');
  const [completeItem, setCompleteItem] = useState<WaybillTask | null>(null);
  const [completeNote, setCompleteNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyWaybillTasks(date);
      setTasks(data);
    } catch (err) {
      setTasks([]);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Не удалось загрузить маршрут',
      });
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const openCompleteModal = useCallback((item: WaybillTask) => {
    setCompleteNote('');
    setCompleteItem(item);
  }, []);

  const handleCompleteConfirm = useCallback(async () => {
    if (!completeItem) return;
    setSubmitting(true);
    try {
      await completeWaybillTask(completeItem.id, completeNote.trim() || null);
      setMessage({ type: 'success', text: 'Задание выполнено' });
      setCompleteItem(null);
      setCompleteNote('');
      await loadTasks();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Не удалось отметить',
      });
    } finally {
      setSubmitting(false);
    }
  }, [completeItem, completeNote, loadTasks]);

  const handleFailConfirm = useCallback(async () => {
    if (!failItem) return;
    if (!failNote.trim()) {
      setMessage({ type: 'error', text: 'Укажите причину невыполнения' });
      return;
    }
    setSubmitting(true);
    try {
      await failWaybillTask(failItem.id, failNote.trim());
      setMessage({ type: 'success', text: 'Отмечено как не выполнено' });
      setFailItem(null);
      setFailNote('');
      await loadTasks();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Не удалось отметить',
      });
    } finally {
      setSubmitting(false);
    }
  }, [failItem, failNote, loadTasks]);

  return {
    date,
    setDate,
    tasks,
    loading,
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
  };
}

export type MyWaybillPageModel = ReturnType<typeof useMyWaybillPage>;
