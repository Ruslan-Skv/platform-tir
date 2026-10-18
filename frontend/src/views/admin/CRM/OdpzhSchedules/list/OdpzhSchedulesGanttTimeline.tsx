'use client';

import { useMemo } from 'react';

import type { OdpzhScheduleRow } from '@/shared/api/crm/admin-odpzh-schedules';

import { ODPZH_DIRECTION_LABELS } from './OdpzhSchedulesPageView';
import styles from './odpzh-gantt.module.css';

type Props = {
  items: OdpzhScheduleRow[];
  loading: boolean;
};

type AxisTick = {
  key: string;
  label: string;
  leftPct: number;
};

type EntryMark = {
  id: string;
  leftPct: number;
  status: 'PLANNED' | 'DONE' | 'FAILED';
  title: string;
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

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

/** Полоса краснее, если ближайший запланированный монтаж уже прошёл или близко. */
function barToneClass(nearest: string | null): string {
  if (!nearest) return styles.barOk;
  const today = todayUtcMs();
  const ms = parseDayMs(nearest);
  if (ms == null) return styles.barOk;
  if (ms < today) return styles.barUrgent;
  if (ms <= addUtcDays(today, 3)) return styles.barHigh;
  return styles.barOk;
}

export function OdpzhSchedulesGanttTimeline({ items, loading }: Props) {
  // Таймлайн показывает все договоры, кроме закрытых.
  const visible = useMemo(() => items.filter((item) => item.status !== 'CLOSED'), [items]);

  const chart = useMemo(() => {
    const today = todayUtcMs();
    const starts: number[] = [];
    const ends: number[] = [];

    for (const item of visible) {
      for (const entry of item.entries) {
        const start = parseDayMs(entry.date);
        const end = parseDayMs(entry.dateEnd ?? entry.date);
        if (start != null) starts.push(start);
        if (end != null) ends.push(end);
      }
      // Срок договора тоже должен попадать в диапазон оси.
      const deadline = parseDayMs(item.contractEndDate);
      if (deadline != null) ends.push(deadline);
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

    const startMsOf = (item: OdpzhScheduleRow) =>
      item.entries.length
        ? Math.min(...item.entries.map((e) => parseDayMs(e.date) ?? Number.POSITIVE_INFINITY))
        : Number.POSITIVE_INFINITY;
    const createdMsOf = (item: OdpzhScheduleRow) => parseDayMs(item.createdAt) ?? 0;

    // Сверху — договоры без монтажей (новые, по дате договора),
    // ниже — по дате первого монтажа.
    const rows = [...visible]
      .sort((a, b) => {
        const aHas = a.entries.length > 0;
        const bHas = b.entries.length > 0;
        if (aHas !== bHas) return aHas ? 1 : -1;
        return (aHas ? startMsOf(a) : createdMsOf(a)) - (bHas ? startMsOf(b) : createdMsOf(b));
      })
      .map((item) => {
        const entryDays = item.entries
          .map((entry) => ({
            entry,
            start: parseDayMs(entry.date),
            end: parseDayMs(entry.dateEnd ?? entry.date),
          }))
          .filter(
            (e): e is { entry: OdpzhScheduleRow['entries'][number]; start: number; end: number } =>
              e.start != null && e.end != null
          );
        if (entryDays.length === 0) {
          return {
            item,
            ready: false as const,
            leftPct: 0,
            widthPct: 0,
            marks: [] as EntryMark[],
            deadlineMs: parseDayMs(item.contractEndDate),
          };
        }
        const startMs = Math.min(...entryDays.map((e) => e.start));
        const endMs = Math.max(...entryDays.map((e) => e.end));
        const left = toPct(startMs);
        const right = toPct(Math.max(endMs, startMs));
        const width = Math.max(0.8, right - left);
        const marks: EntryMark[] = entryDays.map(({ entry, start, end }) => ({
          id: entry.id,
          // позиция метки — относительно полосы договора
          leftPct: clampPct(
            endMs > startMs
              ? ((Math.round((start + Math.max(end, start)) / 2) - startMs) / (endMs - startMs)) *
                  100
              : 50
          ),
          status: entry.status,
          title: `${formatDate(entry.date)}${
            entry.dateEnd ? ` → ${formatDate(entry.dateEnd)}` : ''
          } — ${entry.status === 'PLANNED' ? 'Запланирован' : entry.status === 'DONE' ? 'Выполнен' : 'Сорван'}${
            entry.installerName ? ` · ${entry.installerName}` : ''
          }`,
        }));
        return {
          item,
          ready: true as const,
          leftPct: left,
          widthPct: width,
          marks,
          deadlineMs: parseDayMs(item.contractEndDate),
        };
      });

    return {
      rangeStart,
      rangeEnd,
      todayPct: toPct(today),
      toPct,
      ticks,
      rows,
    };
  }, [visible]);

  if (loading && visible.length === 0) {
    return <p className={styles.empty}>Загрузка…</p>;
  }

  if (visible.length === 0) {
    return (
      <p className={styles.empty}>
        Нет договоров для таймлайна. Выберите статус «Новые договора» или «В работе» либо снимите
        фильтры.
      </p>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.legend} aria-label="Легенда монтажей">
        <span className={`${styles.legendSwatch} ${styles.entryPlanned}`} /> Запланирован
        <span className={`${styles.legendSwatch} ${styles.entryDone}`} /> Выполнен
        <span className={`${styles.legendSwatch} ${styles.entryFailed}`} /> Сорван
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

          {chart.rows.map((row, rowIndex) => (
            <div key={row.item.id} className={styles.row}>
              <div
                className={`${styles.labelCell} ${rowIndex % 2 === 0 ? styles.labelObjectTintA : styles.labelObjectTintB}`}
                title={row.item.contractNumber || undefined}
              >
                <strong className={styles.labelContract}>
                  {(row.item.contractNumber || 'Без номера') +
                    (row.item.contractDate ? ` · от ${formatDate(row.item.contractDate)}` : '')}
                </strong>
                <span className={styles.labelMaster}>{row.item.customerName?.trim() || '—'}</span>
                <span className={styles.labelAddress}>
                  {[
                    ODPZH_DIRECTION_LABELS[row.item.kind] ?? row.item.kind,
                    row.item.customerAddress?.trim() || '',
                    row.item.installerNames.length ? row.item.installerNames.join(', ') : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>

              <div className={styles.track}>
                <div
                  className={styles.todayLine}
                  style={{ left: `${chart.todayPct}%` }}
                  aria-hidden
                />
                {row.deadlineMs != null ? (
                  <div
                    className={styles.deadlineLine}
                    style={{ left: `${chart.toPct(row.deadlineMs)}%` }}
                    title={`Срок договора до ${formatDate(row.item.contractEndDate)}${
                      row.item.deadlineDaysLeft != null && row.item.deadlineDaysLeft < 0
                        ? ` · просрочен ${Math.abs(row.item.deadlineDaysLeft)} дн.`
                        : ''
                    }`}
                  />
                ) : null}
                {row.ready ? (
                  <div
                    className={`${styles.bar} ${barToneClass(row.item.nearestInstallationDate)}`}
                    style={{ left: `${row.leftPct}%`, width: `${row.widthPct}%` }}
                    title={`${row.item.contractNumber || 'Договор'}: ${
                      row.item.entries.length
                    } монтажей${
                      row.item.contractEndDate
                        ? ` · срок договора до ${formatDate(row.item.contractEndDate)}`
                        : ''
                    }`}
                  >
                    {row.marks.map((mark) => (
                      <span
                        key={mark.id}
                        className={`${styles.entryDot} ${
                          mark.status === 'DONE'
                            ? styles.entryDone
                            : mark.status === 'FAILED'
                              ? styles.entryFailed
                              : styles.entryPlanned
                        }`}
                        style={{ left: `${mark.leftPct}%` }}
                        title={mark.title}
                      />
                    ))}
                  </div>
                ) : (
                  <div className={styles.barMissing}>Монтажи ещё не запланированы</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
