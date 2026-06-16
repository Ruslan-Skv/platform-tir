'use client';

import { useMemo } from 'react';

import Link from 'next/link';

import styles from './KnowledgeTrainingAnalyticsPage.module.css';
import { TrainingAnalyticsBarFill } from './components/TrainingAnalyticsBarFill';
import { TrainingAnalyticsDonut } from './components/TrainingAnalyticsDonut';
import { TrainingAnalyticsTimelineBar } from './components/TrainingAnalyticsTimelineBar';
import type { KnowledgeTrainingAnalyticsPageModel } from './hooks/useKnowledgeTrainingAnalyticsPage';
import {
  chartToneClass,
  formatDateTime,
  formatEmployeeName,
  formatPercentWithSymbol,
  formatRoleLabel,
  formatShortDate,
  getMaterialTypeLabel,
} from './knowledge-training-analytics.utils';

type KnowledgeTrainingAnalyticsPageViewProps = {
  model: KnowledgeTrainingAnalyticsPageModel;
};

function maxTimelineValue(
  timeline: Array<{ videoProgressUpdates: number; quizAttempts: number }>
): number {
  let max = 1;
  for (const row of timeline) {
    max = Math.max(max, row.videoProgressUpdates, row.quizAttempts);
  }
  return max;
}

export function KnowledgeTrainingAnalyticsPageView({
  model,
}: KnowledgeTrainingAnalyticsPageViewProps) {
  const { period, setPeriod, dateFrom, setDateFrom, dateTo, setDateTo, data, loading, error } =
    model;

  const timelineMax = useMemo(() => (data ? maxTimelineValue(data.activityTimeline) : 1), [data]);

  const timelineTicks = useMemo(() => {
    if (!data?.activityTimeline.length) return [];
    const rows = data.activityTimeline;
    if (rows.length <= 14) return rows;
    const step = Math.ceil(rows.length / 14);
    return rows.filter((_, index) => index % step === 0 || index === rows.length - 1);
  }, [data]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <Link href="/admin/knowledge" className={styles.backLink}>
            ← Территория знаний
          </Link>
          <h1 className={styles.title}>Статистика обучения</h1>
          <p className={styles.subtitle}>
            Динамика прохождения материалов всеми сотрудниками компании: просмотр видео, попытки
            тестов и общий прогресс. Учитываются опубликованные материалы с отслеживаемым прогрессом
            (видео и материалы с тестом).
          </p>
        </div>

        <div className={styles.filters}>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className={styles.select}
            aria-label="Период активности"
          >
            <option value="week">7 дней</option>
            <option value="month">30 дней</option>
            <option value="quarter">90 дней</option>
            <option value="year">Год</option>
            <option value="custom">Свой период</option>
          </select>
          {period === 'custom' && (
            <>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={styles.dateInput}
                aria-label="Дата начала"
              />
              <span>—</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={styles.dateInput}
                aria-label="Дата окончания"
              />
            </>
          )}
        </div>
      </header>

      {loading && <div className={styles.message}>Загрузка статистики…</div>}
      {error && <div className={styles.error}>{error}</div>}

      {!loading && !error && data && (
        <>
          <div className={styles.overviewGrid}>
            <div className={styles.overviewCard}>
              <span className={styles.overviewValue}>
                {formatPercentWithSymbol(data.summary.avgCompletionPercent)}
              </span>
              <span className={styles.overviewLabel}>Средний прогресс по компании</span>
              <span className={styles.overviewHint}>
                По {data.summary.trackableMaterials} отслеживаемым материалам
              </span>
            </div>
            <div className={styles.overviewCard}>
              <span className={styles.overviewValue}>
                {data.summary.activeEmployees} / {data.summary.totalEmployees}
              </span>
              <span className={styles.overviewLabel}>Активны за период</span>
              <span className={styles.overviewHint}>
                Сотрудники с просмотром видео или попыткой теста
              </span>
            </div>
            <div className={styles.overviewCard}>
              <span className={styles.overviewValue}>{data.summary.videosCompleted}</span>
              <span className={styles.overviewLabel}>Видео завершено</span>
              <span className={styles.overviewHint}>
                {data.summary.videoUpdates} обновлений прогресса за период
              </span>
            </div>
            <div className={styles.overviewCard}>
              <span className={styles.overviewValue}>{data.summary.quizzesPassed}</span>
              <span className={styles.overviewLabel}>Тестов пройдено</span>
              <span className={styles.overviewHint}>
                {data.summary.quizAttempts} попыток за период
              </span>
            </div>
          </div>

          <div className={styles.chartsRow}>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Активность по дням</h2>
                <div className={styles.legend}>
                  <span className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${styles.legendDotVideo}`} />
                    Просмотр видео
                  </span>
                  <span className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${styles.legendDotQuiz}`} />
                    Попытки тестов
                  </span>
                </div>
              </div>
              <p className={styles.cardHint}>
                Период: {formatShortDate(data.period.from)} — {formatShortDate(data.period.to)}
              </p>
              <div
                className={styles.timelineChart}
                role="img"
                aria-label="График активности обучения"
              >
                {timelineTicks.map((day) => (
                  <div key={day.date} className={styles.timelineGroup}>
                    <div className={styles.timelineBars}>
                      <TrainingAnalyticsTimelineBar
                        heightPercent={(day.videoProgressUpdates / timelineMax) * 100}
                        variant="video"
                        title={`Видео: ${day.videoProgressUpdates}`}
                      />
                      <TrainingAnalyticsTimelineBar
                        heightPercent={(day.quizAttempts / timelineMax) * 100}
                        variant="quiz"
                        title={`Тесты: ${day.quizAttempts}`}
                      />
                    </div>
                    <span className={styles.timelineLabel}>{formatShortDate(day.date)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Статус прохождения</h2>
              </div>
              <p className={styles.cardHint}>
                Все пары «сотрудник × отслеживаемый материал»: завершено, в процессе или не начато.
              </p>
              <div className={styles.donutWrap}>
                <TrainingAnalyticsDonut
                  completedPercent={data.statusDistribution.completedPercent}
                  inProgressPercent={data.statusDistribution.inProgressPercent}
                >
                  <div className={styles.donutCenter}>
                    <span className={styles.donutValue}>
                      {formatPercentWithSymbol(data.statusDistribution.completedPercent)}
                    </span>
                    <span className={styles.donutLabel}>завершено</span>
                  </div>
                </TrainingAnalyticsDonut>
                <div className={styles.donutLegend}>
                  <div className={styles.donutLegendItem}>
                    <span className={`${styles.donutSwatch} ${styles.swatchCompleted}`} />
                    <span>
                      Завершено — {data.statusDistribution.completed} (
                      {formatPercentWithSymbol(data.statusDistribution.completedPercent)})
                    </span>
                  </div>
                  <div className={styles.donutLegendItem}>
                    <span className={`${styles.donutSwatch} ${styles.swatchInProgress}`} />
                    <span>
                      В процессе — {data.statusDistribution.inProgress} (
                      {formatPercentWithSymbol(data.statusDistribution.inProgressPercent)})
                    </span>
                  </div>
                  <div className={styles.donutLegendItem}>
                    <span className={`${styles.donutSwatch} ${styles.swatchNotStarted}`} />
                    <span>
                      Не начато — {data.statusDistribution.notStarted} (
                      {formatPercentWithSymbol(data.statusDistribution.notStartedPercent)})
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className={styles.tablesRow}>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Прогресс по сотрудникам</h2>
              </div>
              <div className={styles.barChart}>
                {data.employees.slice(0, 12).map((employee, index) => (
                  <div key={employee.userId} className={styles.barRow}>
                    <span className={styles.barName} title={employee.email}>
                      {formatEmployeeName(employee)}
                    </span>
                    <div className={styles.barTrack}>
                      <TrainingAnalyticsBarFill
                        percent={employee.completionPercent}
                        toneClass={chartToneClass(index)}
                      />
                    </div>
                    <span className={styles.barValue}>
                      {formatPercentWithSymbol(employee.completionPercent)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>По ролям</h2>
              </div>
              <div className={styles.barChart}>
                {data.roleDistribution.map((row, index) => (
                  <div key={row.role} className={styles.barRow}>
                    <span className={styles.barName}>
                      {formatRoleLabel(row.role)} ({row.employeeCount})
                    </span>
                    <div className={styles.barTrack}>
                      <TrainingAnalyticsBarFill
                        percent={row.avgCompletionPercent}
                        toneClass={chartToneClass(index + 2)}
                      />
                    </div>
                    <span className={styles.barValue}>
                      {formatPercentWithSymbol(row.avgCompletionPercent)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className={styles.tablesRow}>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Материалы с наименьшим охватом</h2>
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Материал</th>
                    <th>Завершили</th>
                    <th>Охват</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.topMaterials]
                    .reverse()
                    .slice(0, 8)
                    .map((material, index) => (
                      <tr key={material.materialId}>
                        <td>
                          <span className={styles.rank}>{index + 1}</span>
                          {material.title}
                          <div className={styles.tableMeta}>
                            {getMaterialTypeLabel(material.type)} · {material.categoryName}
                          </div>
                        </td>
                        <td>
                          {material.completedCount} / {material.employeeCount}
                        </td>
                        <td>{formatPercentWithSymbol(material.completionPercent)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Лидеры по материалам</h2>
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Материал</th>
                    <th>Завершили</th>
                    <th>Охват</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topMaterials.slice(0, 8).map((material, index) => (
                    <tr key={material.materialId}>
                      <td>
                        <span className={styles.rank}>{index + 1}</span>
                        {material.title}
                        <div className={styles.tableMeta}>
                          {getMaterialTypeLabel(material.type)}
                          {material.hasQuiz ? ' · с тестом' : ''}
                        </div>
                      </td>
                      <td>
                        {material.completedCount} / {material.employeeCount}
                      </td>
                      <td>{formatPercentWithSymbol(material.completionPercent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Детализация по сотрудникам</h2>
            </div>
            <div className={styles.typePills}>
              <div className={styles.typePill}>
                <span className={styles.typePillValue}>{data.materialsByType.VIDEO.total}</span>
                <span className={styles.typePillLabel}>
                  Видео ({data.materialsByType.VIDEO.trackable} отслеживаемых)
                </span>
              </div>
              <div className={styles.typePill}>
                <span className={styles.typePillValue}>{data.materialsByType.ARTICLE.total}</span>
                <span className={styles.typePillLabel}>
                  Статьи ({data.materialsByType.ARTICLE.withQuiz} с тестом)
                </span>
              </div>
              <div className={styles.typePill}>
                <span className={styles.typePillValue}>{data.materialsByType.LINK.total}</span>
                <span className={styles.typePillLabel}>
                  Ссылки ({data.materialsByType.LINK.withQuiz} с тестом)
                </span>
              </div>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Сотрудник</th>
                  <th>Роль</th>
                  <th>Прогресс</th>
                  <th>Видео</th>
                  <th>Тесты</th>
                  <th>Последняя активность</th>
                </tr>
              </thead>
              <tbody>
                {data.employees.map((employee) => (
                  <tr key={employee.userId}>
                    <td>{formatEmployeeName(employee)}</td>
                    <td>{formatRoleLabel(employee.role)}</td>
                    <td>
                      {employee.completedCount} / {employee.trackableCount} (
                      {formatPercentWithSymbol(employee.completionPercent)})
                    </td>
                    <td>{employee.videosCompleted}</td>
                    <td>{employee.quizzesPassed}</td>
                    <td>{formatDateTime(employee.lastActivityAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
