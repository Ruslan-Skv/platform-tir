'use client';

import Link from 'next/link';

import type {
  DashboardTrainingDynamicsResponse,
  DashboardTrainingEmployeeRow,
} from '@/shared/api/admin-dashboard';
import { formatEmployeeName } from '@/views/admin/Knowledge/analytics/knowledge-training-analytics.utils';

import styles from '../Dashboard.module.css';

function formatPercent(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'percent',
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value / 100);
}

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

type TrainingDynamicsWidgetProps = {
  data: DashboardTrainingDynamicsResponse | null;
  loading: boolean;
};

function EmployeeProgressChart({
  employees,
  trackableMaterials,
}: {
  employees: DashboardTrainingEmployeeRow[];
  trackableMaterials: number;
}) {
  if (employees.length === 0) {
    return (
      <p className={styles.empty}>
        Нет сотрудников для статистики (или не назначены материалы для отслеживания).
      </p>
    );
  }

  return (
    <div className={styles.trainingEmployeesWrap}>
      <h3 className={styles.chartTitle}>Прогресс по сотрудникам</h3>
      <p className={styles.chartHint}>
        Сортировка по проценту завершения материалов ({trackableMaterials} шт.): лучшие сверху,
        отстающие внизу.
      </p>
      <ul className={styles.chartList}>
        {employees.map((employee, index) => (
          <li key={employee.userId} className={styles.chartRow}>
            <span className={styles.chartName} title={employee.email}>
              <span className={styles.trainingEmployeeRank}>{index + 1}</span>
              {formatEmployeeName(employee)}
            </span>
            <div className={styles.chartTrack}>
              <div
                className={`${styles.chartFill} ${chartFillToneClass(index)}`}
                style={{ width: `${employee.completionPercent}%` }}
              />
            </div>
            <span className={styles.chartNum}>
              <span className={styles.chartCount}>{formatPercent(employee.completionPercent)}</span>
              <span className={styles.chartPct}>
                {employee.completedCount}/{employee.trackableCount}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TrainingDynamicsWidget({ data, loading }: TrainingDynamicsWidgetProps) {
  const employees = data?.employees ?? [];
  const hasData = employees.length > 0;

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
      ) : !data || !hasData ? (
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

          <EmployeeProgressChart
            employees={employees}
            trackableMaterials={data.summary.trackableMaterials}
          />
        </>
      )}
    </section>
  );
}
