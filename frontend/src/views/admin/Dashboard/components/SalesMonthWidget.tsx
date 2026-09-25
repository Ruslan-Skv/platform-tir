'use client';

import Link from 'next/link';

import type { DashboardSalesMonthResponse } from '@/shared/api/admin-dashboard';

import styles from '../Dashboard.module.css';

const rubFormat = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

function chartFillToneClass(index: number): string {
  switch (index % 8) {
    case 0:
      return styles.chartFillTone0;
    case 1:
      return styles.chartFillTone1;
    case 2:
      return styles.chartFillTone2;
    case 3:
      return styles.chartFillTone3;
    case 4:
      return styles.chartFillTone4;
    case 5:
      return styles.chartFillTone5;
    case 6:
      return styles.chartFillTone6;
    default:
      return styles.chartFillTone7;
  }
}

type SalesBarRow = { id: string; label: string; sum: number };

function SalesBarChart({
  rows,
  totalSum,
  'aria-label': ariaLabel,
}: {
  rows: SalesBarRow[];
  totalSum: number;
  'aria-label': string;
}) {
  // В столбцы попадают только положительные суммы: возвраты и изъятия учтены в итоге.
  const bars = rows.filter((row) => row.sum > 0);
  const barsTotal = bars.reduce((acc, row) => acc + row.sum, 0);

  if (bars.length === 0) {
    return <p className={styles.empty}>Положительных оплат за месяц нет.</p>;
  }

  return (
    <div className={styles.chart} role="img" aria-label={ariaLabel}>
      <p className={styles.chartHint}>
        Столбцы — доля от суммы оплат за месяц ({rubFormat.format(barsTotal)}).
      </p>
      <ul className={styles.chartList}>
        {bars.map((row, index) => {
          const widthPct = barsTotal > 0 ? (row.sum / barsTotal) * 100 : 0;
          const share = totalSum > 0 ? (row.sum / totalSum) * 100 : 0;
          return (
            <li key={row.id} className={styles.chartRow}>
              <span className={styles.chartName} title={row.label}>
                {row.label}
              </span>
              <div className={styles.chartTrack}>
                <div
                  className={`${styles.chartFill} ${chartFillToneClass(index)}`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <span className={styles.chartNum}>
                <span className={styles.chartCount}>{rubFormat.format(row.sum)}</span>
                <span className={styles.chartPct} title="Доля от итога месяца">
                  {share.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Продажи за текущий месяц: итог и разбивка по направлениям и менеджерам (журнал ДП). */
export function SalesMonthWidget({
  data,
  loading,
}: {
  data: DashboardSalesMonthResponse | null;
  loading: boolean;
}) {
  const monthLabel = data
    ? new Date(data.periodFrom).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    : '';

  const directionRows: SalesBarRow[] = (data?.directionSums ?? []).map((row) => ({
    id: row.direction ?? '__none',
    label: row.direction ?? 'Без направления',
    sum: row.sum,
  }));
  const managerRows: SalesBarRow[] = (data?.managerSums ?? []).map((row) => ({
    id: row.managerId ?? '__none',
    label: row.name,
    sum: row.sum,
  }));

  return (
    <section className={styles.panel}>
      <div className={`${styles.panelHead} ${styles.panelHeadSales}`}>
        <span className={styles.panelIcon} aria-hidden>
          📊
        </span>
        <div className={styles.panelHeadText}>
          <h2 className={styles.panelTitle}>Продажи за текущий месяц</h2>
          <p className={styles.panelSubtitle}>
            {monthLabel ? `${monthLabel} · оплаты по журналу ДП` : 'Оплаты по журналу ДП'}
          </p>
        </div>
        {data ? (
          <span className={styles.salesTotalWrap}>
            <span className={styles.salesTotal}>{rubFormat.format(data.totalSum)}</span>
          </span>
        ) : null}
        <Link href="/admin/dp" className={styles.panelLink}>
          Журнал ДП →
        </Link>
      </div>
      {loading ? (
        <p className={styles.empty}>Загрузка…</p>
      ) : !data ? (
        <p className={styles.empty}>Не удалось загрузить продажи за месяц.</p>
      ) : (
        <>
          <div className={styles.chartsWrap}>
            <div className={styles.chartBlock}>
              <h3 className={styles.chartTitle}>По направлениям</h3>
              <SalesBarChart
                rows={directionRows}
                totalSum={data.totalSum}
                aria-label="Продажи за месяц по направлениям"
              />
            </div>
            <div className={styles.chartBlock}>
              <h3 className={styles.chartTitle}>По менеджерам</h3>
              <SalesBarChart
                rows={managerRows}
                totalSum={data.totalSum}
                aria-label="Продажи за месяц по менеджерам"
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
