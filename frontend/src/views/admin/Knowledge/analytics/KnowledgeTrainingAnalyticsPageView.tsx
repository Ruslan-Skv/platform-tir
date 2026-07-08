'use client';

import { useMemo } from 'react';

import { KnowledgeBackLink } from '../shared/ui/KnowledgeBackLink';
import styles from './KnowledgeTrainingAnalyticsPage.module.css';
import { TrainingAnalyticsBarFill } from './components/TrainingAnalyticsBarFill';
import { TrainingAnalyticsCategoryProgress } from './components/TrainingAnalyticsCategoryProgress';
import { TrainingAnalyticsCollapsibleSection } from './components/TrainingAnalyticsCollapsibleSection';
import { TrainingAnalyticsDonut } from './components/TrainingAnalyticsDonut';
import { TrainingAnalyticsMaterialMatrix } from './components/TrainingAnalyticsMaterialMatrix';
import { TrainingAnalyticsTimelineBar } from './components/TrainingAnalyticsTimelineBar';
import type { KnowledgeTrainingAnalyticsPageModel } from './hooks/useKnowledgeTrainingAnalyticsPage';
import {
  chartToneClass,
  formatDateTime,
  formatEmployeeName,
  formatPercentWithSymbol,
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
  const {
    canView,
    isTrainee,
    period,
    setPeriod,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    data,
    personalData,
    loading,
    error,
  } = model;

  const timelineMax = useMemo(() => (data ? maxTimelineValue(data.activityTimeline) : 1), [data]);

  const personalTimelineMax = useMemo(
    () => (personalData ? maxTimelineValue(personalData.activityTimeline) : 1),
    [personalData]
  );

  const timelineTicks = useMemo(() => {
    if (!data?.activityTimeline.length) return [];
    const rows = data.activityTimeline;
    if (rows.length <= 14) return rows;
    const step = Math.ceil(rows.length / 14);
    return rows.filter((_, index) => index % step === 0 || index === rows.length - 1);
  }, [data]);

  const personalTimelineTicks = useMemo(() => {
    if (!personalData?.activityTimeline.length) return [];
    const rows = personalData.activityTimeline;
    if (rows.length <= 14) return rows;
    const step = Math.ceil(rows.length / 14);
    return rows.filter((_, index) => index % step === 0 || index === rows.length - 1);
  }, [personalData]);

  if (!canView) {
    return null;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <KnowledgeBackLink href="/admin/knowledge" className={styles.backLinkSlot}>
            ← Территория знаний
          </KnowledgeBackLink>
          <h1 className={styles.title}>
            {isTrainee ? 'Мой прогресс обучения' : 'Статистика обучения'}
          </h1>
          <p className={styles.subtitle}>
            {isTrainee
              ? 'Ваш личный прогресс по опубликованным материалам с отслеживаемым результатом: видео и материалы с тестом. Динамика показана отдельно по каждой категории.'
              : 'Динамика прохождения материалов всеми сотрудниками компании: просмотр видео, попытки тестов и общий прогресс. Учитываются опубликованные материалы с отслеживаемым прогрессом (видео и материалы с тестом).'}
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
            <div className={styles.dateRangeRow}>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={styles.dateInput}
                aria-label="Дата начала"
              />
              <span className={styles.dateRangeSep}>—</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={styles.dateInput}
                aria-label="Дата окончания"
              />
            </div>
          )}
        </div>
      </header>

      {loading && <div className={styles.message}>Загрузка статистики…</div>}
      {error && <div className={styles.error}>{error}</div>}

      {!loading && !error && isTrainee && personalData && (
        <>
          <div className={styles.overviewGrid}>
            <div className={styles.overviewCard}>
              <span className={styles.overviewValue}>
                {formatPercentWithSymbol(personalData.summary.completionPercent)}
              </span>
              <span className={styles.overviewLabel}>Общий прогресс</span>
              <span className={styles.overviewHint}>
                {personalData.summary.completedCount} из {personalData.summary.trackableCount}{' '}
                отслеживаемых материалов
              </span>
            </div>
            <div className={styles.overviewCard}>
              <span className={styles.overviewValue}>{personalData.summary.videosCompleted}</span>
              <span className={styles.overviewLabel}>Видео завершено</span>
              <span className={styles.overviewHint}>
                {personalData.summary.videoUpdates} обновлений прогресса за период
              </span>
            </div>
            <div className={styles.overviewCard}>
              <span className={styles.overviewValue}>{personalData.summary.quizzesPassed}</span>
              <span className={styles.overviewLabel}>Тестов пройдено</span>
              <span className={styles.overviewHint}>
                {personalData.summary.quizAttempts} попыток за период
              </span>
            </div>
            <div className={styles.overviewCard}>
              <span className={styles.overviewValue}>
                {formatDateTime(personalData.summary.lastActivityAt)}
              </span>
              <span className={styles.overviewLabel}>Последняя активность</span>
              <span className={styles.overviewHint}>Просмотр видео или попытка теста</span>
            </div>
          </div>

          <TrainingAnalyticsCategoryProgress
            categories={personalData.categories.map((category) => ({
              categoryId: category.categoryId,
              categoryName: category.categoryName,
              completionPercent: category.completionPercent,
              trackableCount: category.trackableCount,
              completedCount: category.completedCount,
            }))}
            categoryTimeline={personalData.categoryTimeline}
            periodFrom={personalData.period.from}
            periodTo={personalData.period.to}
            percentLabel="Ваш прогресс"
          />

          <div className={styles.sectionsStack}>
            <TrainingAnalyticsCollapsibleSection
              title="Ваша активность по дням"
              hint={`Период: ${formatShortDate(personalData.period.from)} — ${formatShortDate(personalData.period.to)}`}
              defaultExpanded={false}
              compact
              headerExtra={
                <div className={styles.legend}>
                  <span className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${styles.legendDotVideo}`} />
                    Видео
                  </span>
                  <span className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${styles.legendDotQuiz}`} />
                    Тесты
                  </span>
                </div>
              }
            >
              <div
                className={`${styles.timelineChart} ${styles.timelineChartCompact}`}
                role="img"
                aria-label="График вашей активности обучения"
              >
                {personalTimelineTicks.map((day) => (
                  <div key={day.date} className={styles.timelineGroup}>
                    <div className={styles.timelineBars}>
                      <TrainingAnalyticsTimelineBar
                        heightPercent={(day.videoProgressUpdates / personalTimelineMax) * 100}
                        variant="video"
                        title={`Видео: ${day.videoProgressUpdates}`}
                      />
                      <TrainingAnalyticsTimelineBar
                        heightPercent={(day.quizAttempts / personalTimelineMax) * 100}
                        variant="quiz"
                        title={`Тесты: ${day.quizAttempts}`}
                      />
                    </div>
                    <span className={styles.timelineLabel}>{formatShortDate(day.date)}</span>
                  </div>
                ))}
              </div>
            </TrainingAnalyticsCollapsibleSection>
          </div>
        </>
      )}

      {!loading && !error && !isTrainee && data && (
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

          <TrainingAnalyticsCategoryProgress
            categories={data.categories.map((category) => ({
              categoryId: category.categoryId,
              categoryName: category.categoryName,
              completionPercent: category.avgCompletionPercent,
              trackableCount: category.trackableCount,
            }))}
            categoryTimeline={data.categoryTimeline}
            categoryEmployeeBreakdown={data.categoryEmployeeBreakdown}
            periodFrom={data.period.from}
            periodTo={data.period.to}
            percentLabel="Средний прогресс"
          />

          <div className={styles.sectionsStack}>
            <div className={styles.chartsRow}>
              <TrainingAnalyticsCollapsibleSection
                title="Активность по дням"
                hint={`Период: ${formatShortDate(data.period.from)} — ${formatShortDate(data.period.to)}`}
                defaultExpanded={false}
                compact
                headerExtra={
                  <div className={styles.legend}>
                    <span className={styles.legendItem}>
                      <span className={`${styles.legendDot} ${styles.legendDotVideo}`} />
                      Видео
                    </span>
                    <span className={styles.legendItem}>
                      <span className={`${styles.legendDot} ${styles.legendDotQuiz}`} />
                      Тесты
                    </span>
                  </div>
                }
              >
                <div
                  className={`${styles.timelineChart} ${styles.timelineChartCompact}`}
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
              </TrainingAnalyticsCollapsibleSection>

              <TrainingAnalyticsCollapsibleSection
                title="Статус прохождения"
                hint="Завершено, в процессе или не начато по всем парам «сотрудник × материал»"
                badge={formatPercentWithSymbol(data.statusDistribution.completedPercent)}
                defaultExpanded={false}
                compact
              >
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
              </TrainingAnalyticsCollapsibleSection>
            </div>

            <TrainingAnalyticsCollapsibleSection
              title="Прогресс по сотрудникам"
              hint="Общий прогресс по всем отслеживаемым материалам"
              badge={`${data.employees.length} чел.`}
              defaultExpanded={false}
              compact
            >
              <div className={styles.barChart}>
                {data.employees.map((employee, index) => (
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
            </TrainingAnalyticsCollapsibleSection>

            <TrainingAnalyticsMaterialMatrix
              employeeMaterialStatus={data.employeeMaterialStatus}
              employees={data.employees}
              categories={data.categories}
            />

            <div className={styles.tablesRow}>
              <TrainingAnalyticsCollapsibleSection
                title="Материалы с наименьшим охватом"
                badge="топ-8"
                defaultExpanded={false}
                compact
              >
                <div className={styles.tableScroll}>
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
                </div>
              </TrainingAnalyticsCollapsibleSection>

              <TrainingAnalyticsCollapsibleSection
                title="Лидеры по материалам"
                badge="топ-8"
                defaultExpanded={false}
                compact
              >
                <div className={styles.tableScroll}>
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
                </div>
              </TrainingAnalyticsCollapsibleSection>
            </div>

            <TrainingAnalyticsCollapsibleSection
              title="Детализация по сотрудникам"
              hint="Полная таблица с видео, тестами и последней активностью"
              badge={`${data.employees.length} чел.`}
              defaultExpanded={false}
              compact
            >
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
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Сотрудник</th>
                      <th>Email</th>
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
                        <td>{employee.email}</td>
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
              </div>
            </TrainingAnalyticsCollapsibleSection>
          </div>
        </>
      )}
    </div>
  );
}
