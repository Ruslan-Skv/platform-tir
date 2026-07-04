'use client';

import Link from 'next/link';

import type { DashboardTrainingDynamicsResponse } from '@/shared/api/admin-dashboard';

import styles from '../Dashboard.module.css';

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  });
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'percent',
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value / 100);
}

type TrainingDynamicsWidgetProps = {
  data: DashboardTrainingDynamicsResponse | null;
  loading: boolean;
};

export function TrainingDynamicsWidget({ data, loading }: TrainingDynamicsWidgetProps) {
  const timeline = data?.timeline ?? [];
  const timelineMax = Math.max(1, ...timeline.map((row) => row.completionPercent));

  const timelineTicks =
    timeline.length <= 14
      ? timeline
      : timeline.filter((_, index) => {
          const step = Math.ceil(timeline.length / 14);
          return index % step === 0 || index === timeline.length - 1;
        });

  return (
    <section className={`${styles.panel} ${styles.trainingPanel}`}>
      <div className={styles.panelHead}>
        <span className={styles.panelIcon} aria-hidden>
          📚
        </span>
        <div className={styles.panelHeadText}>
          <h2 className={styles.panelTitle}>Динамика обучения сотрудников</h2>
          <p className={styles.panelSubtitle}>
            Средний прогресс по материалам «Территории знаний» (без стажёров)
          </p>
        </div>
        <Link href="/admin/knowledge/analytics" className={styles.panelLink}>
          Подробная статистика →
        </Link>
      </div>

      {loading ? (
        <p className={styles.empty}>Загрузка…</p>
      ) : !data || timeline.length === 0 ? (
        <p className={styles.empty}>Нет данных за выбранный период.</p>
      ) : (
        <>
          <div className={styles.trainingSummary}>
            <div className={styles.trainingSummaryItem}>
              <span className={styles.trainingSummaryValue}>
                {formatPercent(data.summary.avgCompletionPercent)}
              </span>
              <span className={styles.trainingSummaryLabel}>Средний прогресс</span>
            </div>
            <div className={styles.trainingSummaryItem}>
              <span className={styles.trainingSummaryValue}>{data.summary.totalEmployees}</span>
              <span className={styles.trainingSummaryLabel}>Сотрудников</span>
            </div>
            <div className={styles.trainingSummaryItem}>
              <span className={styles.trainingSummaryValue}>{data.summary.trackableMaterials}</span>
              <span className={styles.trainingSummaryLabel}>Материалов</span>
            </div>
          </div>

          <div className={styles.trainingChartWrap}>
            <h3 className={styles.chartTitle}>Общий прогресс по дням</h3>
            <p className={styles.chartHint}>
              Период: {formatShortDate(data.period.from)} — {formatShortDate(data.period.to)}
            </p>
            <div
              className={styles.trainingTimelineChart}
              role="img"
              aria-label="График динамики прохождения обучения сотрудниками"
            >
              {timelineTicks.map((day) => (
                <div key={day.date} className={styles.trainingTimelineGroup}>
                  <div className={styles.trainingTimelineBars}>
                    <div
                      className={styles.trainingTimelineBar}
                      style={{ height: `${(day.completionPercent / timelineMax) * 100}%` }}
                      title={`${formatShortDate(day.date)}: ${formatPercent(day.completionPercent)}`}
                    />
                  </div>
                  <span className={styles.trainingTimelineLabel}>{formatShortDate(day.date)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
