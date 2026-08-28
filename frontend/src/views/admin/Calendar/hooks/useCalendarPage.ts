'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { type AdminUserItem, getAdminAccessUsers } from '@/shared/api/admin-access';
import {
  type CalendarEvent,
  type CalendarEventType,
  createCalendarCustomEvent,
  listCalendarEvents,
} from '@/shared/api/calendar/admin-calendar';

import { ALL_CALENDAR_TYPES, monthRangeIso, todayIsoDate } from '../calendar.utils';

export type CalendarPageModel = ReturnType<typeof useCalendarPage>;

export function useCalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex0, setMonthIndex0] = useState(now.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [enabledTypes, setEnabledTypes] = useState<CalendarEventType[]>([...ALL_CALENDAR_TYPES]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState(todayIsoDate());
  const [createTitle, setCreateTitle] = useState('');
  const [createBody, setCreateBody] = useState('');
  const [createTimeFrom, setCreateTimeFrom] = useState('');
  const [createTimeTo, setCreateTimeTo] = useState('');
  const [createNotifyIds, setCreateNotifyIds] = useState<string[]>([]);

  const range = useMemo(() => monthRangeIso(year, monthIndex0), [year, monthIndex0]);

  const reload = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await listCalendarEvents({
        from: range.from,
        to: range.to,
        types: enabledTypes,
      });
      setEvents(res.events);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Ошибка загрузки');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [enabledTypes, range.from, range.to]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    void getAdminAccessUsers()
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  const setMonth = useCallback((nextYear: number, nextMonthIndex0: number) => {
    setYear(nextYear);
    setMonthIndex0(nextMonthIndex0);
  }, []);

  const toggleType = useCallback((type: CalendarEventType) => {
    setEnabledTypes((prev) => {
      if (prev.includes(type)) {
        if (prev.length === 1) return prev;
        return prev.filter((t) => t !== type);
      }
      return [...prev, type];
    });
  }, []);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [events]);

  const openCreate = useCallback((isoDate: string) => {
    setCreateDate(isoDate);
    setCreateTitle('');
    setCreateBody('');
    setCreateTimeFrom('');
    setCreateTimeTo('');
    setCreateNotifyIds([]);
    setCreateOpen(true);
  }, []);

  const submitCreate = useCallback(async () => {
    if (!createTitle.trim() || busy) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      await createCalendarCustomEvent({
        title: createTitle.trim(),
        body: createBody.trim() || null,
        date: createDate,
        timeFrom: createTimeFrom.trim() || null,
        timeTo: createTimeTo.trim() || null,
        notifyUserIds: createNotifyIds,
      });
      setCreateOpen(false);
      await reload();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Не удалось создать событие');
    } finally {
      setBusy(false);
    }
  }, [
    busy,
    createBody,
    createDate,
    createNotifyIds,
    createTimeFrom,
    createTimeTo,
    createTitle,
    reload,
  ]);

  return {
    year,
    monthIndex0,
    setMonth,
    eventsByDate,
    enabledTypes,
    toggleType,
    loading,
    busy,
    errorMessage,
    reload,
    users,
    openCreate,
    createOpen,
    setCreateOpen,
    createDate,
    setCreateDate,
    createTitle,
    setCreateTitle,
    createBody,
    setCreateBody,
    createTimeFrom,
    setCreateTimeFrom,
    createTimeTo,
    setCreateTimeTo,
    createNotifyIds,
    setCreateNotifyIds,
    submitCreate,
  };
}
