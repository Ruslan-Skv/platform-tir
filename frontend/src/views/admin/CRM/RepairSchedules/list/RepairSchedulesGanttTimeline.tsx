'use client';

import { useMemo } from 'react';

import type { RepairScheduleProject } from '@/shared/api/crm/admin-repair-schedules';

import { RepairDeadlineWarningBadge } from '../shared/RepairDeadlineWarningBadge';
import styles from '../shared/RepairSchedulesGantt.module.css';
import { formatDate } from '../shared/repair-schedules';
import { buildRepairObjectGroups } from '../shared/repairObjectGroups';

type Props = {
  items: RepairScheduleProject[];
  loading: boolean;
  onOpenProject: (id: string) => void;
};

type AxisTick = {
  key: string;
  label: string;
  leftPct: number;
};

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
  return ms + days * 24 * 60 * 60 * 1000;
}

function formatAxisLabel(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function barToneClass(warning: RepairScheduleProject['deadlineWarning']): string {
  if (warning === 'OVERDUE' || warning === 'D3') return styles.barUrgent;
  if (warning === 'D10') return styles.barHigh;
  if (warning === 'D20') return styles.barWarn;
  return styles.barOk;
}

export function RepairSchedulesGanttTimeline({ items, loading, onOpenProject }: Props) {
  const inProgress = useMemo(() => items.filter((item) => item.status === 'IN_PROGRESS'), [items]);

  const chart = useMemo(() => {
    const today = todayUtcMs();
    const starts: number[] = [];
    const ends: number[] = [];

    for (const item of inProgress) {
      const start = parseDayMs(item.workStartActDate) ?? parseDayMs(item.plannedStartDate);
      const end = parseDayMs(item.calculatedEndDate) ?? parseDayMs(item.workCloseActDate);
      if (start != null) starts.push(start);
      if (end != null) ends.push(end);
    }

    let rangeStart = starts.length ? Math.min(...starts) : today;
    let rangeEnd = ends.length ? Math.max(...ends) : addUtcDays(today, 60);
    rangeStart = Math.min(rangeStart, today);
    rangeEnd = Math.max(rangeEnd, today);
    // запас по краям
    rangeStart = addUtcDays(rangeStart, -7);
    rangeEnd = addUtcDays(rangeEnd, 14);
    if (rangeEnd <= rangeStart) {
      rangeEnd = addUtcDays(rangeStart, 30);
    }

    const totalMs = rangeEnd - rangeStart;
    const toPct = (ms: number) => clampPct(((ms - rangeStart) / totalMs) * 100);

    const ticks: AxisTick[] = [];
    const cursor = new Date(rangeStart);
    cursor.setUTCDate(1);
    if (cursor.getTime() < rangeStart) {
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    // месячные риски
    for (let i = 0; i < 24; i++) {
      const ms = Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1);
      if (ms > rangeEnd) break;
      if (ms >= rangeStart) {
        ticks.push({
          key: `m-${ms}`,
          label: cursor.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }),
          leftPct: toPct(ms),
        });
      }
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    // если диапазон короткий — недельные риски
    if (ticks.length < 2) {
      ticks.length = 0;
      let week = rangeStart;
      while (week <= rangeEnd) {
        ticks.push({
          key: `w-${week}`,
          label: formatAxisLabel(week),
          leftPct: toPct(week),
        });
        week = addUtcDays(week, 7);
      }
    }

    const endMsOf = (item: RepairScheduleProject) =>
      parseDayMs(item.calculatedEndDate) ??
      parseDayMs(item.workCloseActDate) ??
      Number.POSITIVE_INFINITY;

    // Договоры одного объекта рядом; группы — по ближайшему сроку окончания
    const objectGroups = buildRepairObjectGroups(inProgress)
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
        const startMs = parseDayMs(item.workStartActDate) ?? parseDayMs(item.plannedStartDate);
        const endMs = parseDayMs(item.calculatedEndDate) ?? parseDayMs(item.workCloseActDate);
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
      ticks,
      rows,
    };
  }, [inProgress]);

  if (loading && inProgress.length === 0) {
    return <p className={styles.empty}>Загрузка…</p>;
  }

  if (inProgress.length === 0) {
    return (
      <p className={styles.empty}>
        Нет договоров «В работе» для таймлайна. Выберите статус «В работе» или снимите фильтры.
      </p>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.legend} aria-label="Легенда сроков">
        <span className={`${styles.legendSwatch} ${styles.barOk}`} /> В сроке
        <span className={`${styles.legendSwatch} ${styles.barWarn}`} /> ≤20 дн.
        <span className={`${styles.legendSwatch} ${styles.barHigh}`} /> ≤10 дн.
        <span className={`${styles.legendSwatch} ${styles.barUrgent}`} /> ≤3 дн. / просрочен
        <span className={styles.legendToday}>| сегодня</span>
      </div>

      <div className={styles.scroll}>
        <div className={styles.grid}>
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
                </strong>
                <span className={styles.labelMaster}>{row.item.installerName?.trim() || '—'}</span>
                <span className={styles.labelAddress}>
                  {row.item.customerAddress?.trim() || '—'}
                </span>
                <RepairDeadlineWarningBadge
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
                      row.item.workStartActDate || row.item.plannedStartDate
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
                        {formatDate(row.item.workStartActDate || row.item.plannedStartDate)}
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
                    Нет дат начала/окончания — заполните акт начала и срок
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
