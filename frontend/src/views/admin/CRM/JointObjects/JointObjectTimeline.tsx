'use client';

import { useMemo } from 'react';

import { useRouter } from 'next/navigation';

import type { JointObjectCluster, JointTimelineItem } from '@/shared/api/crm/admin-joint-objects';

import styles from './JointObjects.module.css';

type Props = {
  object: JointObjectCluster;
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

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function toneClass(item: JointTimelineItem): string {
  if (item.deadlineWarning === 'OVERDUE' || item.deadlineWarning === 'D3') return styles.toneUrgent;
  if (item.deadlineWarning === 'D10' || item.deadlineWarning === 'D20') return styles.toneWarn;
  const map: Record<string, string> = {
    WINDOWS: styles.toneWINDOWS,
    DOORS: styles.toneDOORS,
    CEILINGS: styles.toneCEILINGS,
    BLINDS: styles.toneBLINDS,
    REPAIR: styles.toneREPAIR,
    FURNITURE: styles.toneFURNITURE,
    DELIVERY: styles.toneDELIVERY,
  };
  return map[item.direction] || styles.toneDELIVERY;
}

export function JointObjectTimeline({ object }: Props) {
  const router = useRouter();

  const chart = useMemo(() => {
    const today = todayUtcMs();
    const starts: number[] = [];
    const ends: number[] = [];
    for (const item of object.items) {
      const s = parseDayMs(item.startDate);
      const e = parseDayMs(item.endDate) ?? s;
      if (s != null) starts.push(s);
      if (e != null) ends.push(e);
    }
    let rangeStart = starts.length ? Math.min(...starts) : today;
    let rangeEnd = ends.length ? Math.max(...ends) : addUtcDays(today, 60);
    rangeStart = Math.min(rangeStart, today);
    rangeEnd = Math.max(rangeEnd, today);
    rangeStart = addUtcDays(rangeStart, -7);
    rangeEnd = addUtcDays(rangeEnd, 14);
    if (rangeEnd <= rangeStart) rangeEnd = addUtcDays(rangeStart, 30);
    const totalMs = rangeEnd - rangeStart;
    const toPct = (ms: number) => clampPct(((ms - rangeStart) / totalMs) * 100);

    const ticks: Array<{ key: string; label: string; leftPct: number }> = [];
    const cursor = new Date(rangeStart);
    cursor.setUTCDate(1);
    if (cursor.getTime() < rangeStart) cursor.setUTCMonth(cursor.getUTCMonth() + 1);
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

    const lanes = new Map<string, JointTimelineItem[]>();
    for (const item of object.items) {
      const key = item.directionLabel;
      const list = lanes.get(key);
      if (list) list.push(item);
      else lanes.set(key, [item]);
    }

    return {
      ticks,
      todayPct: toPct(today),
      toPct,
      lanes: [...lanes.entries()],
    };
  }, [object.items]);

  return (
    <div className={styles.timeline} aria-label={`Таймлайн: ${object.label}`}>
      <div className={styles.legend}>
        <span>
          <i className={`${styles.legendSwatch} ${styles.toneREPAIR}`} /> Ремонт
        </span>
        <span>
          <i className={`${styles.legendSwatch} ${styles.toneFURNITURE}`} /> Мебель
        </span>
        <span>
          <i className={`${styles.legendSwatch} ${styles.toneWINDOWS}`} /> Окна
        </span>
        <span>
          <i className={`${styles.legendSwatch} ${styles.toneDOORS}`} /> Двери
        </span>
        <span>
          <i className={`${styles.legendSwatch} ${styles.toneCEILINGS}`} /> Потолки
        </span>
        <span>
          <i className={`${styles.legendSwatch} ${styles.toneBLINDS}`} /> Жалюзи
        </span>
        <span>
          <i className={`${styles.legendSwatch} ${styles.toneDELIVERY}`} /> Доставка
        </span>
        <span className={styles.legendToday}>| сегодня</span>
      </div>

      <div className={styles.scroll}>
        <div className={styles.timelineInner}>
          <div className={styles.axis}>
            {chart.ticks.map((t) => (
              <span key={t.key} className={styles.axisTick} style={{ left: `${t.leftPct}%` }}>
                <span>{t.label}</span>
              </span>
            ))}
            <div className={styles.todayLine} style={{ left: `${chart.todayPct}%` }} />
          </div>

          {chart.lanes.map(([label, items]) => (
            <div key={label} className={styles.lane}>
              <div className={styles.laneLabel}>{label}</div>
              <div className={styles.laneTrack}>
                <div className={styles.todayLine} style={{ left: `${chart.todayPct}%` }} />
                {items.map((item) => {
                  const start = parseDayMs(item.startDate);
                  const end = parseDayMs(item.endDate) ?? start;
                  if (start == null || end == null) return null;
                  const left = chart.toPct(start);
                  const right = chart.toPct(end);
                  const width = Math.max(0.6, right - left);
                  const title = [
                    item.directionLabel,
                    item.title,
                    item.statusLabel,
                    item.startDate,
                    item.endDate && item.endDate !== item.startDate ? `→ ${item.endDate}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  if (item.isPoint) {
                    return (
                      <button
                        key={`${item.kind}-${item.id}`}
                        type="button"
                        className={`${styles.point} ${toneClass(item)}`}
                        style={{ left: `${left}%` }}
                        title={title}
                        aria-label={title}
                        onClick={() => router.push(item.href)}
                      />
                    );
                  }
                  return (
                    <button
                      key={`${item.kind}-${item.id}`}
                      type="button"
                      className={`${styles.bar} ${toneClass(item)}`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      title={title}
                      aria-label={title}
                      onClick={() => router.push(item.href)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
