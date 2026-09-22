'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import {
  type CalendarEvent,
  type CalendarEventType,
  listCalendarEvents,
} from '@/shared/api/calendar/admin-calendar';
import { useAdminNarrowViewport } from '@/shared/lib/hooks/useAdminNarrowViewport';
import { CalendarEventTooltip } from '@/views/admin/Calendar/CalendarEventTooltip';
import calendarStyles from '@/views/admin/Calendar/CalendarPage.module.css';
import {
  ALL_CALENDAR_TYPES,
  CALENDAR_TYPE_LABELS,
  CALENDAR_TYPE_SHORT_LABELS,
  buildDashboardCalendarCells,
  dashboardCalendarRangeIso,
  formatDashboardCalendarRangeRu,
  pillLabel,
  typeDotClass,
  typePillClass,
} from '@/views/admin/Calendar/calendar.utils';

import styles from './CalendarDashboardWidget.module.css';

const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
/** Страховочный лимит компактных чипов в ячейке: свыше — «+N» со списком в тултипе. */
const MAX_CHIPS_DESKTOP = 30;
const MAX_PILLS_MOBILE = 2;

function useCalendarDashboardData() {
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [enabledTypes, setEnabledTypes] = useState<CalendarEventType[]>([...ALL_CALENDAR_TYPES]);

  const range = useMemo(() => dashboardCalendarRangeIso(anchorDate), [anchorDate]);

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
  const isNarrow = useAdminNarrowViewport();
  const maxVisible = isNarrow ? MAX_PILLS_MOBILE : MAX_CHIPS_DESKTOP;

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

  const cells = buildDashboardCalendarCells(anchorDate);
  const rangeLabel = formatDashboardCalendarRangeRu(anchorDate);

  return (
    <section className={styles.root}>
      <div className={styles.head}>
        <div className={styles.headMain}>
          <span className={styles.icon} aria-hidden>
            📅
          </span>
          <div className={styles.headText}>
            <h2 className={styles.title}>Календарь</h2>
            <p className={styles.subtitle}>Прошлая неделя, текущая и следующая</p>
          </div>
        </div>
        <Link href="/admin/calendar" className={styles.openLink}>
          {isNarrow ? 'Открыть' : 'Открыть календарь'}
        </Link>
      </div>

      {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

      <div className={styles.filtersWrap}>
        <div className={styles.filters} role="group" aria-label="Типы событий">
          {ALL_CALENDAR_TYPES.map((type) => {
            const active = enabledTypes.includes(type);
            const label = isNarrow ? CALENDAR_TYPE_SHORT_LABELS[type] : CALENDAR_TYPE_LABELS[type];
            return (
              <button
                key={type}
                type="button"
                className={`${styles.filterChip} ${active ? styles.filterChipActive : ''}`}
                onClick={() => toggleType(type)}
                aria-pressed={active}
                title={CALENDAR_TYPE_LABELS[type]}
              >
                <span
                  className={`${styles.filterDot} ${calendarStyles[typeDotClass(type)]}`}
                  aria-hidden
                />
                <span className={styles.filterLabel}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.calendarWrap} aria-busy={loading}>
        <div className={`${calendarStyles.toolbar} ${styles.toolbar}`}>
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
            {loading ? <p className={styles.loadingHint}>Загрузка…</p> : null}
          </div>
        </div>

        <div className={`${calendarStyles.grid} ${styles.grid}`}>
          {WEEKDAYS.map((day) => (
            <div key={day} className={`${calendarStyles.weekday} ${styles.weekday}`}>
              {day}
            </div>
          ))}
          {cells.map((cell) => {
            const dayItems = eventsByDate.get(cell.isoDate) ?? [];
            const visible = dayItems.slice(0, maxVisible);
            const rest = dayItems.length - visible.length;
            const restItems = dayItems.slice(maxVisible);

            return (
              <div
                key={cell.isoDate}
                className={`${calendarStyles.day} ${styles.fortnightDay}${
                  cell.isToday ? ` ${calendarStyles.dayToday}` : ''
                }`}
              >
                <div className={calendarStyles.dayHeader}>
                  <span className={`${calendarStyles.dayNum} ${styles.dayNum}`}>{cell.day}</span>
                  {isNarrow && dayItems.length > 0 ? (
                    <span className={styles.eventCount} aria-label={`${dayItems.length} событий`}>
                      {dayItems.length}
                    </span>
                  ) : null}
                </div>
                <div
                  className={
                    isNarrow
                      ? `${calendarStyles.pills} ${styles.pills}`
                      : `${calendarStyles.pills} ${calendarStyles.pillsCompact} ${styles.pills}`
                  }
                >
                  {visible.map((event) =>
                    isNarrow ? (
                      <Link
                        key={event.id}
                        href={event.href}
                        className={`${styles.mobileEventMark} ${calendarStyles[typePillClass(event.type)]}`}
                        title={pillLabel(event)}
                        aria-label={pillLabel(event)}
                      />
                    ) : (
                      <Link
                        key={event.id}
                        href={event.href}
                        className={`${calendarStyles.pill} ${calendarStyles.pillCompact} ${calendarStyles[typePillClass(event.type)]}${
                          event.timeFrom ? '' : ` ${calendarStyles.pillDot}`
                        }`}
                        aria-label={pillLabel(event)}
                      >
                        {event.timeFrom ? (
                          <span className={calendarStyles.pillText}>{event.timeFrom}</span>
                        ) : null}
                        <CalendarEventTooltip ev={event} />
                      </Link>
                    )
                  )}
                  {rest > 0 ? (
                    isNarrow ? (
                      <div className={`${calendarStyles.more} ${styles.more}`}>+{rest}</div>
                    ) : (
                      <div className={styles.moreWrap} aria-label={`Ещё событий: ${rest}`}>
                        +{rest}
                        <div className={styles.moreTooltip} role="tooltip">
                          {restItems.map((ev) => (
                            <div key={ev.id} className={styles.moreRow}>
                              <span
                                className={`${styles.moreDot} ${calendarStyles[typeDotClass(ev.type)]}`}
                                aria-hidden
                              />
                              <span className={styles.moreRowLabel}>{pillLabel(ev)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
