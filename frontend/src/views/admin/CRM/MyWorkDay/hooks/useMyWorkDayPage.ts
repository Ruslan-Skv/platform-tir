'use client';

import { useCallback, useEffect, useState } from 'react';

import { useWorkDay } from '@/features/admin/work-day';
import {
  type MyWorkDayHistoryResponse,
  type WorkDayRequest,
  type WorkDayRequestType,
  cancelMyWorkDayRequest,
  createMyWorkDayRequest,
  getMyWorkDayHistory,
  getMyWorkDayRequests,
} from '@/shared/api/admin-work-days';

export function useMyWorkDayPage() {
  const { status: liveStatus, refresh, handleStartAbsence, handleEndAbsence } = useWorkDay();
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const defaultTo = today.toISOString().slice(0, 10);

  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [data, setData] = useState<MyWorkDayHistoryResponse | null>(null);
  const [requests, setRequests] = useState<WorkDayRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestBusy, setRequestBusy] = useState(false);
  const [absenceBusy, setAbsenceBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [next, myRequests] = await Promise.all([
        getMyWorkDayHistory({ dateFrom, dateTo }),
        getMyWorkDayRequests({ dateFrom, dateTo }),
      ]);
      setData(next);
      setRequests(myRequests);
      try {
        await refresh();
      } catch {
        // journal already loaded
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
      setData(null);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, refresh]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitRequest = useCallback(
    async (payload: {
      type: WorkDayRequestType;
      requestDate: string;
      proposedEndTime?: string;
      comment?: string;
    }) => {
      setRequestBusy(true);
      setError(null);
      try {
        await createMyWorkDayRequest(payload);
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось отправить запрос');
        throw e;
      } finally {
        setRequestBusy(false);
      }
    },
    [load]
  );

  const cancelRequest = useCallback(
    async (id: string) => {
      setRequestBusy(true);
      setError(null);
      try {
        await cancelMyWorkDayRequest(id);
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось отменить запрос');
      } finally {
        setRequestBusy(false);
      }
    },
    [load]
  );

  const startAbsence = useCallback(
    async (payload: { reason?: string; comment?: string }) => {
      setAbsenceBusy(true);
      setError(null);
      try {
        await handleStartAbsence(payload.reason, payload.comment);
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось отметить отлучение');
        throw e;
      } finally {
        setAbsenceBusy(false);
      }
    },
    [handleStartAbsence, load]
  );

  const endAbsence = useCallback(async () => {
    setAbsenceBusy(true);
    setError(null);
    try {
      await handleEndAbsence();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отметить возвращение');
      throw e;
    } finally {
      setAbsenceBusy(false);
    }
  }, [handleEndAbsence, load]);

  return {
    liveStatus,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    rows: data?.records ?? [],
    stats: data?.summary ?? null,
    requests,
    loading,
    error,
    requestBusy,
    absenceBusy,
    load,
    submitRequest,
    cancelRequest,
    startAbsence,
    endAbsence,
  };
}

export type MyWorkDayPageModel = ReturnType<typeof useMyWorkDayPage>;
