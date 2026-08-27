'use client';

import styles from './AdvertisingStrategy.module.css';
import {
  buildDonutSegments,
  chartColor,
  formatNumber,
  formatPercent,
  formatRub,
} from './advertising-strategy.utils';

type BudgetSlice = {
  id: string;
  label: string;
  value: number;
  hint?: string;
};

type BarItem = {
  id: string;
  label: string;
  value: number;
  secondary?: number;
  hint?: string;
};

type PlannedActualItem = {
  id: string;
  label: string;
  planned: number;
  actual: number;
};

export function BudgetDonutChart({
  title,
  items,
  centerLabel,
  centerValue,
}: {
  title: string;
  items: BudgetSlice[];
  centerLabel?: string;
  centerValue?: string;
}) {
  const segments = buildDonutSegments(items);
  const total = items.reduce((s, i) => s + Math.max(0, i.value), 0);

  return (
    <div className={styles.chartBlock}>
      <h3 className={styles.chartTitle}>{title}</h3>
      {total <= 0 ? (
        <p className={styles.empty}>Нет данных для диаграммы</p>
      ) : (
        <div className={styles.donutWrap}>
          <svg viewBox="0 0 100 100" className={styles.donutSvg} role="img" aria-label={title}>
            <circle cx="50" cy="50" r="40" className={styles.donutTrack} />
            {segments.map((seg) => (
              <circle
                key={seg.id}
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={seg.color}
                strokeWidth="12"
                strokeDasharray={seg.dasharray}
                strokeDashoffset={seg.dashoffset}
                className={styles.donutSegment}
                transform="rotate(-90 50 50)"
              />
            ))}
            <text x="50" y="48" textAnchor="middle" className={styles.donutCenterValue}>
              {centerValue ?? formatRub(total)}
            </text>
            {centerLabel ? (
              <text x="50" y="58" textAnchor="middle" className={styles.donutCenterLabel}>
                {centerLabel}
              </text>
            ) : null}
          </svg>
          <ul className={styles.chartLegend}>
            {segments.map((seg) => (
              <li key={seg.id}>
                <span className={styles.legendSwatch} style={{ background: seg.color }} />
                <span className={styles.legendLabel}>{seg.label}</span>
                <span className={styles.legendValue}>
                  {formatRub(seg.value)} · {formatPercent(seg.percent)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function HorizontalShareChart({
  title,
  items,
  formatValue = formatRub,
}: {
  title: string;
  items: BarItem[];
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(...items.map((i) => i.value), 0);

  return (
    <div className={styles.chartBlock}>
      <h3 className={styles.chartTitle}>{title}</h3>
      {items.length === 0 || max <= 0 ? (
        <p className={styles.empty}>Нет данных для диаграммы</p>
      ) : (
        <ul className={styles.barList} aria-label={title}>
          {items.map((item, index) => {
            const width = max > 0 ? (item.value / max) * 100 : 0;
            return (
              <li key={item.id} className={styles.barRow}>
                <span className={styles.barName} title={item.hint || item.label}>
                  {item.label}
                </span>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{ width: `${width}%`, background: chartColor(index) }}
                  />
                </div>
                <span className={styles.barValue}>{formatValue(item.value)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function PlannedVsActualChart({
  title,
  items,
}: {
  title: string;
  items: PlannedActualItem[];
}) {
  const max = Math.max(...items.flatMap((i) => [i.planned, i.actual]), 0);

  return (
    <div className={styles.chartBlock}>
      <h3 className={styles.chartTitle}>{title}</h3>
      <div className={styles.chartLegendInline}>
        <span>
          <span className={styles.legendSwatch} style={{ background: '#2563eb' }} /> План
        </span>
        <span>
          <span className={styles.legendSwatch} style={{ background: '#0d9488' }} /> Факт затрат
        </span>
      </div>
      {items.length === 0 || max <= 0 ? (
        <p className={styles.empty}>Нет данных для сравнения</p>
      ) : (
        <ul className={styles.dualBarList} aria-label={title}>
          {items.map((item) => (
            <li key={item.id} className={styles.dualBarRow}>
              <span className={styles.barName}>{item.label}</span>
              <div className={styles.dualBars}>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{
                      width: `${max > 0 ? (item.planned / max) * 100 : 0}%`,
                      background: '#2563eb',
                    }}
                  />
                </div>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{
                      width: `${max > 0 ? (item.actual / max) * 100 : 0}%`,
                      background: '#0d9488',
                    }}
                  />
                </div>
              </div>
              <span className={styles.dualBarMeta}>
                {formatRub(item.planned)} / {formatRub(item.actual)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MetricBarsChart({
  title,
  items,
  formatValue = formatNumber,
}: {
  title: string;
  items: BarItem[];
  formatValue?: (v: number) => string;
}) {
  return <HorizontalShareChart title={title} items={items} formatValue={formatValue} />;
}
