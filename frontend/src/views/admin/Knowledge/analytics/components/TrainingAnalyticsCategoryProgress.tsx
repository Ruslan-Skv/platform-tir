'use client';

import { useMemo } from 'react';

import styles from '../KnowledgeTrainingAnalyticsPage.module.css';
import {
  chartToneClass,
  formatEmployeeName,
  formatPercentWithSymbol,
  formatShortDate,
} from '../knowledge-training-analytics.utils';
import { TrainingAnalyticsBarFill } from './TrainingAnalyticsBarFill';
import { TrainingAnalyticsTimelineBar } from './TrainingAnalyticsTimelineBar';

type CategoryInfo = {
  categoryId: string;
  categoryName: string;
  completionPercent: number;
  trackableCount: number;
  completedCount?: number;
};

type CategoryTimelineDay = {
  date: string;
  categories: Array<{ categoryId: string; completionPercent: number }>;
};

type CategoryEmployeeRow = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  completedCount: number;
  completionPercent: number;
  timeline: Array<{ date: string; completionPercent: number }>;
};

type CategoryEmployeeBreakdown = {
  categoryId: string;
  employees: CategoryEmployeeRow[];
};

type TrainingAnalyticsCategoryProgressProps = {
  categories: CategoryInfo[];
  categoryTimeline: CategoryTimelineDay[];
  categoryEmployeeBreakdown?: CategoryEmployeeBreakdown[];
  periodFrom: string;
  periodTo: string;
  percentLabel?: string;
};

function maxTimelinePercent(values: number[]): number {
  let max = 1;
  for (const value of values) {
    max = Math.max(max, value);
  }
  return max;
}

function maxCategoryTimelinePercent(categoryTimeline: CategoryTimelineDay[]): number {
  const values: number[] = [];
  for (const day of categoryTimeline) {
    for (const category of day.categories) {
      values.push(category.completionPercent);
    }
  }
  return maxTimelinePercent(values);
}

function downsampleTimelineDays<T extends { date: string }>(timeline: T[]): T[] {
  if (!timeline.length) return [];
  if (timeline.length <= 14) return timeline;
  const step = Math.ceil(timeline.length / 14);
  return timeline.filter((_, index) => index % step === 0 || index === timeline.length - 1);
}

export function TrainingAnalyticsCategoryProgress({
  categories,
  categoryTimeline,
  categoryEmployeeBreakdown,
  periodFrom,
  periodTo,
  percentLabel = 'Прогресс',
}: TrainingAnalyticsCategoryProgressProps) {
  const showEmployeeBreakdown = Boolean(categoryEmployeeBreakdown?.length);

  const timelineMax = useMemo(
    () => maxCategoryTimelinePercent(categoryTimeline),
    [categoryTimeline]
  );

  const timelineTicks = useMemo(() => downsampleTimelineDays(categoryTimeline), [categoryTimeline]);

  const percentByCategoryDay = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const day of categoryTimeline) {
      map.set(day.date, new Map(day.categories.map((c) => [c.categoryId, c.completionPercent])));
    }
    return map;
  }, [categoryTimeline]);

  const employeesByCategoryId = useMemo(() => {
    const map = new Map<string, CategoryEmployeeRow[]>();
    for (const row of categoryEmployeeBreakdown ?? []) {
      map.set(row.categoryId, row.employees);
    }
    return map;
  }, [categoryEmployeeBreakdown]);

  const employeeToneByUserId = useMemo(() => {
    const map = new Map<string, string>();
    const employees = categoryEmployeeBreakdown?.[0]?.employees ?? [];
    employees.forEach((employee, index) => {
      map.set(employee.userId, chartToneClass(index));
    });
    for (const breakdown of categoryEmployeeBreakdown ?? []) {
      breakdown.employees.forEach((employee, index) => {
        if (!map.has(employee.userId)) {
          map.set(employee.userId, chartToneClass(index));
        }
      });
    }
    return map;
  }, [categoryEmployeeBreakdown]);

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Динамика прохождения по категориям</h2>
      </div>
      <p className={styles.cardHint}>
        {percentLabel} в процентах по каждой категории за период {formatShortDate(periodFrom)} —{' '}
        {formatShortDate(periodTo)}.
        {showEmployeeBreakdown
          ? ' Ниже среднего показателя — отдельная динамика по каждому сотруднику.'
          : null}
      </p>

      <div className={styles.categoryProgressList}>
        {categories.map((category, categoryIndex) => {
          const categoryEmployees = employeesByCategoryId.get(category.categoryId) ?? [];
          const employeeTimelineTicks = categoryEmployees[0]?.timeline
            ? downsampleTimelineDays(categoryEmployees[0].timeline)
            : [];
          const categoryEmployeeMax = maxTimelinePercent(
            categoryEmployees.flatMap((employee) =>
              employee.timeline.map((day) => day.completionPercent)
            )
          );
          const categoryTimelineMax = Math.max(timelineMax, categoryEmployeeMax);

          return (
            <div key={category.categoryId} className={styles.categoryProgressItem}>
              <div className={styles.categoryProgressHeader}>
                <div className={styles.categoryProgressTitleWrap}>
                  <h3 className={styles.categoryProgressTitle}>{category.categoryName}</h3>
                  {category.completedCount != null ? (
                    <span className={styles.categoryProgressMeta}>
                      {category.completedCount} / {category.trackableCount} материалов
                    </span>
                  ) : (
                    <span className={styles.categoryProgressMeta}>
                      {category.trackableCount} отслеживаемых материалов
                      {showEmployeeBreakdown && categoryEmployees.length > 0
                        ? ` · ${categoryEmployees.length} сотрудников`
                        : null}
                    </span>
                  )}
                </div>
                <span className={styles.categoryProgressValue}>
                  {formatPercentWithSymbol(category.completionPercent)}
                </span>
              </div>

              <div className={styles.categoryAverageBlock}>
                <span className={styles.categoryAverageLabel}>
                  {showEmployeeBreakdown ? 'Средний прогресс' : percentLabel}
                </span>
                <div className={styles.barTrack}>
                  <TrainingAnalyticsBarFill
                    percent={category.completionPercent}
                    toneClass={chartToneClass(categoryIndex)}
                  />
                </div>
                <div
                  className={styles.categoryTimelineChart}
                  role="img"
                  aria-label={`Средняя динамика категории ${category.categoryName}`}
                >
                  {timelineTicks.map((day) => {
                    const percent =
                      percentByCategoryDay.get(day.date)?.get(category.categoryId) ?? 0;
                    return (
                      <div
                        key={`${category.categoryId}-avg-${day.date}`}
                        className={styles.timelineGroup}
                      >
                        <div className={styles.timelineBars}>
                          <TrainingAnalyticsTimelineBar
                            heightPercent={(percent / categoryTimelineMax) * 100}
                            variant="video"
                            title={`Средний: ${formatShortDate(day.date)} — ${formatPercentWithSymbol(percent)}`}
                          />
                        </div>
                        <span className={styles.timelineLabel}>{formatShortDate(day.date)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {showEmployeeBreakdown && categoryEmployees.length > 0 && (
                <div className={styles.categoryEmployeeSection}>
                  <div className={styles.categoryEmployeeSectionHeader}>
                    <span className={styles.categoryEmployeeSectionTitle}>По сотрудникам</span>
                    <div className={styles.categoryEmployeeLegend}>
                      {categoryEmployees.slice(0, 8).map((employee) => (
                        <span key={employee.userId} className={styles.categoryEmployeeLegendItem}>
                          <span
                            className={`${styles.categoryEmployeeLegendDot} ${
                              styles[
                                employeeToneByUserId.get(employee.userId) as keyof typeof styles
                              ] ?? ''
                            }`}
                          />
                          {formatEmployeeName(employee)}
                        </span>
                      ))}
                      {categoryEmployees.length > 8 && (
                        <span className={styles.categoryEmployeeLegendMore}>
                          +{categoryEmployees.length - 8}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.categoryEmployeeList}>
                    {categoryEmployees.map((employee) => {
                      const toneClass =
                        employeeToneByUserId.get(employee.userId) ?? chartToneClass(0);
                      const percentByDay = new Map(
                        employee.timeline.map((day) => [day.date, day.completionPercent])
                      );

                      return (
                        <div key={employee.userId} className={styles.categoryEmployeeRow}>
                          <div className={styles.categoryEmployeeRowHeader}>
                            <span className={styles.categoryEmployeeName} title={employee.email}>
                              {formatEmployeeName(employee)}
                            </span>
                            <span className={styles.categoryEmployeeMeta}>
                              {employee.completedCount} / {category.trackableCount}
                            </span>
                            <span className={styles.categoryEmployeeValue}>
                              {formatPercentWithSymbol(employee.completionPercent)}
                            </span>
                          </div>
                          <div className={styles.barTrack}>
                            <TrainingAnalyticsBarFill
                              percent={employee.completionPercent}
                              toneClass={toneClass}
                            />
                          </div>
                          <div
                            className={styles.categoryEmployeeTimeline}
                            role="img"
                            aria-label={`Динамика ${formatEmployeeName(employee)} в категории ${category.categoryName}`}
                          >
                            {employeeTimelineTicks.map((day) => {
                              const percent = percentByDay.get(day.date) ?? 0;
                              return (
                                <div
                                  key={`${employee.userId}-${day.date}`}
                                  className={styles.timelineGroup}
                                >
                                  <div className={styles.timelineBars}>
                                    <TrainingAnalyticsTimelineBar
                                      heightPercent={(percent / categoryTimelineMax) * 100}
                                      variant="employee"
                                      toneClass={toneClass}
                                      title={`${formatEmployeeName(employee)}: ${formatShortDate(day.date)} — ${formatPercentWithSymbol(percent)}`}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
