'use client';

import { useEffect, useMemo, useRef } from 'react';

import type { FurnitureScheduleProject } from '@/shared/api/crm/admin-furniture-schedules';

import { FurnitureDeadlineWarningBadge } from '../shared/FurnitureDeadlineWarningBadge';
import styles from '../shared/FurnitureSchedulesGantt.module.css';
import { formatDate } from '../shared/furniture-schedules';
import { buildRepairObjectGroups } from '../shared/furnitureObjectGroups';

type Props = {
  items: FurnitureScheduleProject[];
  loading: boolean;
  onOpenProject: (id: string) => void;
};

type AxisTick = {
  key: string;
  label: string;
  leftPct: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
/** Ширина трека на календарный день — длинные периоды уходят в горизонтальный скролл. */
const PX_PER_DAY = 12;
const MIN_TRACK_PX = 720;
const MIN_TICK_GAP_PX = 72;
const LABEL_WIDTH_PX = 240;

function parseDayMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function todayUtcMs(): number {
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

function addUtcDays(ms: number, days: number): number {
  return ms + days * DAY_MS;
}

function formatAxisLabel(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
}

function formatMonthLabel(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' });
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function barToneClass(warning: FurnitureScheduleProject['deadlineWarning']): string {
  if (warning === 'OVERDUE' || warning === 'D3') return styles.barUrgent;
  if (warning === 'D10') return styles.barHigh;
  if (warning === 'D20') return styles.barWarn;
  return styles.barOk;
}

function termStartMs(item: FurnitureScheduleProject): number | null {
  return parseDayMs(item.workStartActDate);
}

function termEndMs(item: FurnitureScheduleProject): number | null {
  return parseDayMs(item.calculatedEndDate) ?? parseDayMs(item.workCloseActDate);
}

export function FurnitureSchedulesGanttTimeline({ items, loading, onOpenProject }: Props) {
  const timelineItems = useMemo(
    () =>
      items.filter(
        (item) => item.status === 'IN_PROGRESS' || item.status === 'NEW' || item.status === 'CLAIMS'
      ),
    [items]
  );

  const chart = useMemo(() => {
    const today = todayUtcMs();
    const starts: number[] = [];
    const ends: number[] = [];

    for (const item of timelineItems) {
      const start = termStartMs(item);
      const end = termEndMs(item);
      if (start != null) starts.push(start);
      if (end != null) ends.push(end);
    }

    let rangeStart = starts.length ? Math.min(...starts) : today;
    let rangeEnd = ends.length ? Math.max(...ends) : addUtcDays(today, 60);
    rangeStart = Math.min(rangeStart, today);
    rangeEnd = Math.max(rangeEnd, today);
    rangeStart = addUtcDays(rangeStart, -7);
    rangeEnd = addUtcDays(rangeEnd, 14);
    if (rangeEnd <= rangeStart) {
      rangeEnd = addUtcDays(rangeStart, 30);
    }

    const daySpan = Math.max(1, Math.ceil((rangeEnd - rangeStart) / DAY_MS));
    const trackWidthPx = Math.max(MIN_TRACK_PX, daySpan * PX_PER_DAY);
    const totalMs = rangeEnd - rangeStart;
    const toPct = (ms: number) => clampPct(((ms - rangeStart) / totalMs) * 100);
    const minTickGapPct = (MIN_TICK_GAP_PX / trackWidthPx) * 100;

    const rawTicks: AxisTick[] = [];
    const cursor = new Date(rangeStart);
    cursor.setUTCDate(1);
    if (cursor.getTime() < rangeStart) {
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    for (let i = 0; i < 48; i++) {
      const ms = Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1);
      if (ms > rangeEnd) break;
      if (ms >= rangeStart) {
        rawTicks.push({
          key: `m-${ms}`,
          label: formatMonthLabel(ms),
          leftPct: toPct(ms),
        });
      }
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    if (rawTicks.length < 2) {
      rawTicks.length = 0;
      let week = rangeStart;
      while (week <= rangeEnd) {
        rawTicks.push({
          key: `w-${week}`,
          label: formatAxisLabel(week),
          leftPct: toPct(week),
        });
        week = addUtcDays(week, 7);
      }
    }

    const ticks: AxisTick[] = [];
    let lastLeft = -Infinity;
    for (const tick of rawTicks) {
      if (tick.leftPct - lastLeft < minTickGapPct) continue;
      ticks.push(tick);
      lastLeft = tick.leftPct;
    }

    const endMsOf = (item: FurnitureScheduleProject) => termEndMs(item) ?? Number.POSITIVE_INFINITY;

    const objectGroups = buildRepairObjectGroups(timelineItems)
      .map((group) => ({
        ...group,
        projects: [...group.projects].sort((a, b) => endMsOf(a) - endMsOf(b)),
      }))
      .sort((a, b) => {
        const ae = Math.min(...a.projects.map(endMsOf));
        const be = Math.min(...b.projects.map(endMsOf));
        return ae - be;
      });

    const rows = objectGroups.flatMap((group, groupIndex) => {
      const objectTint = groupIndex % 2;
      return group.projects.map((item) => {
        const startMs = termStartMs(item);
        const endMs = termEndMs(item);
        if (startMs == null || endMs == null) {
          return {
            item,
            objectTint,
            isObjectCluster: group.isCluster,
            objectLabel: group.label,
            ready: false as const,
            startMs: null,
            endMs: null,
            leftPct: 0,
            widthPct: 0,
            progressPct: 0,
          };
        }
        const left = toPct(startMs);
        const right = toPct(Math.max(endMs, startMs));
        const width = Math.max(0.8, right - left);
        const progress =
          endMs <= startMs
            ? 100
            : clampPct(
                ((Math.min(Math.max(today, startMs), endMs) - startMs) / (endMs - startMs)) * 100
              );
        return {
          item,
          objectTint,
          isObjectCluster: group.isCluster,
          objectLabel: group.label,
          ready: true as const,
          startMs,
          endMs,
          leftPct: left,
          widthPct: width,
          progressPct: progress,
        };
      });
    });

    return {
      rangeStart,
      rangeEnd,
      todayPct: toPct(today),
      todayPx: (toPct(today) / 100) * trackWidthPx,
      ticks,
      rows,
      trackWidthPx,
    };
  }, [timelineItems]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const syncingScroll = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || timelineItems.length === 0) return;

    const centerToday = () => {
      const grid = el.querySelector(`.${styles.grid}`) as HTMLElement | null;
      const labelHead = el.querySelector(`.${styles.labelColHead}`) as HTMLElement | null;
      const labelWidth =
        labelHead?.offsetWidth ||
        (grid
          ? parseFloat(getComputedStyle(grid).getPropertyValue('--gantt-label-width')) ||
            LABEL_WIDTH_PX
          : LABEL_WIDTH_PX);
      const viewport = el.clientWidth;
      const todayLeft = labelWidth + chart.todayPx;
      const next = Math.max(0, todayLeft - viewport / 2);
      el.scrollLeft = next;
      const top = topScrollRef.current;
      if (top) top.scrollLeft = next;
    };

    centerToday();
    const raf = window.requestAnimationFrame(centerToday);
    return () => window.cancelAnimationFrame(raf);
  }, [chart.todayPx, chart.trackWidthPx, timelineItems.length]);

  useEffect(() => {
    const main = scrollRef.current;
    const top = topScrollRef.current;
    if (!main || !top || timelineItems.length === 0) return;

    const onMainScroll = () => {
      if (syncingScroll.current) return;
      syncingScroll.current = true;
      top.scrollLeft = main.scrollLeft;
      syncingScroll.current = false;
    };
    const onTopScroll = () => {
      if (syncingScroll.current) return;
      syncingScroll.current = true;
      main.scrollLeft = top.scrollLeft;
      syncingScroll.current = false;
    };

    main.addEventListener('scroll', onMainScroll, { passive: true });
    top.addEventListener('scroll', onTopScroll, { passive: true });
    return () => {
      main.removeEventListener('scroll', onMainScroll);
      top.removeEventListener('scroll', onTopScroll);
    };
  }, [timelineItems.length, chart.trackWidthPx]);

  if (loading && timelineItems.length === 0) {
    return <p className={styles.empty}>Загрузка…</p>;
  }

  if (timelineItems.length === 0) {
    return (
      <p className={styles.empty}>
        Нет договоров «На очереди» / «В работе» / «Рекламации» для таймлайна. Выберите статус «Все»,
        «На очереди», «В работе» или «Рекламации».
      </p>
    );
  }

  const scrollContentWidth = LABEL_WIDTH_PX + chart.trackWidthPx;

  return (
    <div className={styles.root}>
      <div className={styles.legend} aria-label="Легенда сроков">
        <span className={`${styles.legendSwatch} ${styles.barOk}`} /> В сроке
        <span className={`${styles.legendSwatch} ${styles.barWarn}`} /> ≤20 дн.
        <span className={`${styles.legendSwatch} ${styles.barHigh}`} /> ≤10 дн.
        <span className={`${styles.legendSwatch} ${styles.barUrgent}`} /> ≤3 дн. / просрочен
        <span className={styles.legendToday}>| сегодня</span>
      </div>
      <p className={styles.scrollHint}>
        Горизонтальная прокрутка — полосы сверху и снизу панели; список договоров прокручивается
        внутри панели.
      </p>

      <div
        className={styles.scrollTop}
        ref={topScrollRef}
        aria-label="Горизонтальная прокрутка таймлайна"
      >
        <div className={styles.scrollTopInner} style={{ width: scrollContentWidth }} />
      </div>

      <div className={styles.scroll} ref={scrollRef}>
        <div
          className={styles.grid}
          style={{ ['--gantt-min-track' as string]: `${chart.trackWidthPx}px` }}
        >
          <div className={styles.labelColHead}>Договор</div>
          <div className={styles.axis}>
            {chart.ticks.map((tick) => (
              <div key={tick.key} className={styles.axisTick} style={{ left: `${tick.leftPct}%` }}>
                <span>{tick.label}</span>
              </div>
            ))}
            <div
              className={styles.todayLine}
              style={{ left: `${chart.todayPct}%` }}
              title="Сегодня"
            />
          </div>

          {chart.rows.map((row) => (
            <div key={row.item.id} className={styles.row}>
              <button
                type="button"
                className={`${styles.labelCell} ${
                  row.objectTint === 0 ? styles.labelObjectTintA : styles.labelObjectTintB
                }${row.isObjectCluster ? ` ${styles.labelObjectCluster}` : ''}`}
                title={
                  row.isObjectCluster
                    ? `Объект: ${row.objectLabel}`
                    : row.item.contractNumber || undefined
                }
                onClick={() => onOpenProject(row.item.id)}
              >
                <strong className={styles.labelContract}>
                  {row.item.contractNumber || 'Без номера'}
                  {row.item.status === 'NEW' ? (
                    <span className={styles.labelStatus}> · очередь</span>
                  ) : row.item.status === 'CLAIMS' ? (
                    <span className={styles.labelStatus}> · рекламация</span>
                  ) : null}
                </strong>
                <span className={styles.labelMaster}>{row.item.installerName?.trim() || '—'}</span>
                <span className={styles.labelAddress}>
                  {row.item.customerAddress?.trim() || '—'}
                </span>
                <FurnitureDeadlineWarningBadge
                  level={row.item.deadlineWarning}
                  daysLeft={row.item.deadlineDaysLeft}
                />
              </button>

              <div className={styles.track}>
                <div
                  className={styles.todayLine}
                  style={{ left: `${chart.todayPct}%` }}
                  aria-hidden
                />
                {row.ready ? (
                  <button
                    type="button"
                    className={`${styles.bar} ${barToneClass(row.item.deadlineWarning)}`}
                    style={{ left: `${row.leftPct}%`, width: `${row.widthPct}%` }}
                    title={`${row.item.contractNumber || 'Договор'}: ${formatDate(
                      row.item.workStartActDate
                    )} → ${formatDate(row.item.calculatedEndDate)}`}
                    onClick={() => onOpenProject(row.item.id)}
                  >
                    <span
                      className={styles.barProgress}
                      style={{ width: `${row.progressPct}%` }}
                      aria-hidden
                    />
                    <span className={styles.barLabel}>
                      <span className={styles.barDates}>
                        {formatDate(row.item.workStartActDate)}
                        {' → '}
                        {formatDate(row.item.calculatedEndDate)}
                      </span>
                      {row.item.deadlineDaysLeft != null ? (
                        <span className={styles.barDays}>
                          {row.item.deadlineDaysLeft < 0
                            ? `+${Math.abs(row.item.deadlineDaysLeft)} дн.`
                            : `${row.item.deadlineDaysLeft} дн.`}
                        </span>
                      ) : null}
                    </span>
                  </button>
                ) : (
                  <div className={styles.barMissing}>
                    Нет начала/окончания срока — укажите дату договора (или дату КЗ) и срок в раб.
                    днях
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
