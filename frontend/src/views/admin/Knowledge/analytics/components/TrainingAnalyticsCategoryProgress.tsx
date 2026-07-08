'use client';

import { useMemo, useState } from 'react';

import styles from '../KnowledgeTrainingAnalyticsPage.module.css';
import {
  chartToneClass,
  formatEmployeeName,
  formatPercentWithSymbol,
  formatShortDate,
} from '../knowledge-training-analytics.utils';
import { TrainingAnalyticsBarFill } from './TrainingAnalyticsBarFill';
import { TrainingAnalyticsCollapsibleSection } from './TrainingAnalyticsCollapsibleSection';
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

const MAX_TIMELINE_TICKS = 10;

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
  if (timeline.length <= MAX_TIMELINE_TICKS) return timeline;
  const step = Math.ceil(timeline.length / MAX_TIMELINE_TICKS);
  return timeline.filter((_, index) => index % step === 0 || index === timeline.length - 1);
}

function CategoryEmployeesBlock({
  categoryName,
  trackableCount,
  categoryEmployees,
  employeeToneByUserId,
  categoryTimelineMax,
  employeeTimelineTicks,
}: {
  categoryName: string;
  trackableCount: number;
  categoryEmployees: CategoryEmployeeRow[];
  employeeToneByUserId: Map<string, string>;
  categoryTimelineMax: number;
  employeeTimelineTicks: Array<{ date: string }>;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={styles.categoryEmployeeSection}>
      <button
        type="button"
        className={styles.categoryEmployeeToggle}
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <span className={styles.categoryEmployeeToggleChevron} aria-hidden>
          {expanded ? '▾' : '▸'}
        </span>
        <span className={styles.categoryEmployeeSectionTitle}>
          По сотрудникам ({categoryEmployees.length})
        </span>
        {!expanded && categoryEmployees[0] ? (
          <span className={styles.categoryEmployeeTogglePreview}>
            лидер: {formatEmployeeName(categoryEmployees[0])} —{' '}
            {formatPercentWithSymbol(categoryEmployees[0].completionPercent)}
          </span>
        ) : null}
      </button>

      {expanded && (
        <div className={styles.categoryEmployeeList}>
          {categoryEmployees.map((employee) => {
            const toneClass = employeeToneByUserId.get(employee.userId) ?? chartToneClass(0);
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
                    {employee.completedCount} / {trackableCount}
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
                  aria-label={`Динамика ${formatEmployeeName(employee)} в категории ${categoryName}`}
                >
                  {employeeTimelineTicks.map((day) => {
                    const percent = percentByDay.get(day.date) ?? 0;
                    return (
                      <div key={`${employee.userId}-${day.date}`} className={styles.timelineGroup}>
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
      )}
    </div>
  );
}

function CategoryProgressItem({
  category,
  categoryIndex,
  showEmployeeBreakdown,
  categoryEmployees,
  employeeToneByUserId,
  timelineTicks,
  percentByCategoryDay,
  categoryTimelineMax,
}: {
  category: CategoryInfo;
  categoryIndex: number;
  showEmployeeBreakdown: boolean;
  categoryEmployees: CategoryEmployeeRow[];
  employeeToneByUserId: Map<string, string>;
  timelineTicks: CategoryTimelineDay[];
  percentByCategoryDay: Map<string, Map<string, number>>;
  categoryTimelineMax: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const employeeTimelineTicks = categoryEmployees[0]?.timeline
    ? downsampleTimelineDays(categoryEmployees[0].timeline)
    : [];

  const meta =
    category.completedCount != null
      ? `${category.completedCount} / ${category.trackableCount} материалов`
      : `${category.trackableCount} отслеживаемых${showEmployeeBreakdown && categoryEmployees.length > 0 ? ` · ${categoryEmployees.length} сотр.` : ''}`;

  return (
    <div
      className={`${styles.categoryProgressItem} ${expanded ? styles.categoryProgressItemExpanded : ''}`}
    >
      <button
        type="button"
        className={styles.categoryProgressToggle}
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <span className={styles.categoryProgressChevron} aria-hidden>
          {expanded ? '▾' : '▸'}
        </span>
        <div className={styles.categoryProgressHeader}>
          <div className={styles.categoryProgressTitleWrap}>
            <h3 className={styles.categoryProgressTitle}>{category.categoryName}</h3>
            <span className={styles.categoryProgressMeta}>{meta}</span>
          </div>
          <span className={styles.categoryProgressValue}>
            {formatPercentWithSymbol(category.completionPercent)}
          </span>
        </div>
        <div className={styles.barTrack}>
          <TrainingAnalyticsBarFill
            percent={category.completionPercent}
            toneClass={chartToneClass(categoryIndex)}
          />
        </div>
      </button>

      {expanded && (
        <div className={styles.categoryAverageBlock}>
          <span className={styles.categoryAverageLabel}>
            {showEmployeeBreakdown ? 'Средний прогресс' : 'Динамика'}
          </span>
          <div
            className={`${styles.categoryTimelineChart} ${styles.categoryTimelineChartCompact}`}
            role="img"
            aria-label={`Средняя динамика категории ${category.categoryName}`}
          >
            {timelineTicks.map((day) => {
              const percent = percentByCategoryDay.get(day.date)?.get(category.categoryId) ?? 0;
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

          {showEmployeeBreakdown && categoryEmployees.length > 0 && (
            <CategoryEmployeesBlock
              categoryName={category.categoryName}
              trackableCount={category.trackableCount}
              categoryEmployees={categoryEmployees}
              employeeToneByUserId={employeeToneByUserId}
              categoryTimelineMax={categoryTimelineMax}
              employeeTimelineTicks={employeeTimelineTicks}
            />
          )}
        </div>
      )}
    </div>
  );
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

  const hint = `${percentLabel} за период ${formatShortDate(periodFrom)} — ${formatShortDate(periodTo)}. Раскройте категорию для графика и детализации по сотрудникам.`;

  return (
    <TrainingAnalyticsCollapsibleSection
      title="Динамика прохождения по категориям"
      hint={hint}
      badge={`${categories.length} кат.`}
      defaultExpanded={false}
      compact
    >
      <div className={styles.categoryProgressList}>
        {categories.map((category, categoryIndex) => {
          const categoryEmployees = employeesByCategoryId.get(category.categoryId) ?? [];
          const categoryEmployeeMax = maxTimelinePercent(
            categoryEmployees.flatMap((employee) =>
              employee.timeline.map((day) => day.completionPercent)
            )
          );
          const categoryTimelineMax = Math.max(timelineMax, categoryEmployeeMax);

          return (
            <CategoryProgressItem
              key={category.categoryId}
              category={category}
              categoryIndex={categoryIndex}
              showEmployeeBreakdown={showEmployeeBreakdown}
              categoryEmployees={categoryEmployees}
              employeeToneByUserId={employeeToneByUserId}
              timelineTicks={timelineTicks}
              percentByCategoryDay={percentByCategoryDay}
              categoryTimelineMax={categoryTimelineMax}
            />
          );
        })}
      </div>
    </TrainingAnalyticsCollapsibleSection>
  );
}
