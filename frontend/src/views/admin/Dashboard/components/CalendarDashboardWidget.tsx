'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import {
  type CalendarEvent,
  type CalendarEventType,
  listCalendarEvents,
} from '@/shared/api/calendar/admin-calendar';
import calendarStyles from '@/views/admin/Calendar/CalendarPage.module.css';
import {
  ALL_CALENDAR_TYPES,
  CALENDAR_TYPE_LABELS,
  buildFortnightCalendarCells,
  dashboardFortnightRangeIso,
  formatDashboardFortnightRangeRu,
  pillLabel,
  typeDotClass,
  typePillClass,
} from '@/views/admin/Calendar/calendar.utils';

import styles from './CalendarDashboardWidget.module.css';

const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
const MAX_PILLS = 3;

function useCalendarDashboardData() {
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [enabledTypes, setEnabledTypes] = useState<CalendarEventType[]>([...ALL_CALENDAR_TYPES]);

  const range = useMemo(() => dashboardFortnightRangeIso(anchorDate), [anchorDate]);

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
      setErrorMessage(e instanceof Error ? e.message : 'Ошибка загрузки календаря');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [enabledTypes, range.from, range.to]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const resetToToday = useCallback(() => {
    setAnchorDate(new Date());
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
    for (const event of events) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
  }, [events]);

  return {
    anchorDate,
    eventsByDate,
    enabledTypes,
    toggleType,
    loading,
    errorMessage,
    reload,
    resetToToday,
  };
}

export function CalendarDashboardWidget() {
  const {
    anchorDate,
    eventsByDate,
    enabledTypes,
    toggleType,
    loading,
    errorMessage,
    reload,
    resetToToday,
  } = useCalendarDashboardData();

  const cells = buildFortnightCalendarCells(anchorDate);
  const rangeLabel = formatDashboardFortnightRangeRu(anchorDate);

  return (
    <section className={styles.root}>
      <div className={styles.head}>
        <div className={styles.headMain}>
          <span className={styles.icon} aria-hidden>
            📅
          </span>
          <div>
            <h2 className={styles.title}>Календарь</h2>
            <p className={styles.subtitle}>Неделя назад и неделя вперёд от сегодня</p>
          </div>
        </div>
        <Link href="/admin/calendar" className={styles.openLink}>
          Открыть календарь
        </Link>
      </div>

      {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

      <div className={calendarStyles.filters} role="group" aria-label="Типы событий">
        {ALL_CALENDAR_TYPES.map((type) => {
          const active = enabledTypes.includes(type);
          return (
            <button
              key={type}
              type="button"
              className={`${calendarStyles.filterChip} ${active ? calendarStyles.filterChipActive : ''}`}
              onClick={() => toggleType(type)}
              aria-pressed={active}
            >
              <span
                className={`${calendarStyles.filterDot} ${calendarStyles[typeDotClass(type)]}`}
                aria-hidden
              />
              {CALENDAR_TYPE_LABELS[type]}
            </button>
          );
        })}
      </div>

      <div className={styles.calendarWrap} aria-busy={loading}>
        <div className={calendarStyles.toolbar}>
          <h3 className={styles.rangeTitle}>{rangeLabel}</h3>
          <div className={styles.toolbarActions}>
            <button
              type="button"
              className={styles.todayBtn}
              disabled={loading}
              onClick={resetToToday}
            >
              Сегодня
            </button>
            <button
              type="button"
              className={styles.refreshBtn}
              disabled={loading}
              onClick={() => void reload()}
              title="Обновить"
              aria-label="Обновить календарь"
            >
              ↻
            </button>
            {loading ? <p className={calendarStyles.loadingHint}>Загрузка календаря…</p> : null}
          </div>
        </div>

        <div className={calendarStyles.grid}>
          {WEEKDAYS.map((day) => (
            <div key={day} className={calendarStyles.weekday}>
              {day}
            </div>
          ))}
          {cells.map((cell) => {
            if (cell.isPadding) {
              return (
                <div key={cell.isoDate} className={`${calendarStyles.day} ${styles.padDay}`} />
              );
            }

            const dayItems = eventsByDate.get(cell.isoDate) ?? [];
            const visible = dayItems.slice(0, MAX_PILLS);
            const rest = dayItems.length - visible.length;

            return (
              <div
                key={cell.isoDate}
                className={`${calendarStyles.day} ${styles.fortnightDay}${
                  cell.isToday ? ` ${calendarStyles.dayToday}` : ''
                }`}
              >
                <div className={calendarStyles.dayHeader}>
                  <span className={calendarStyles.dayNum}>{cell.day}</span>
                </div>
                <div className={calendarStyles.pills}>
                  {visible.map((event) => (
                    <Link
                      key={event.id}
                      href={event.href}
                      className={`${calendarStyles.pill} ${calendarStyles[typePillClass(event.type)]}`}
                    >
                      <span className={calendarStyles.pillText}>{pillLabel(event)}</span>
                    </Link>
                  ))}
                  {rest > 0 ? <div className={calendarStyles.more}>ещё {rest}</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
