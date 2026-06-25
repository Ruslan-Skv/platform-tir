'use client';

import { useMemo } from 'react';

import styles from '../KnowledgeTrainingAnalyticsPage.module.css';
import {
  chartToneClass,
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

type TrainingAnalyticsCategoryProgressProps = {
  categories: CategoryInfo[];
  categoryTimeline: CategoryTimelineDay[];
  periodFrom: string;
  periodTo: string;
  percentLabel?: string;
};

function maxCategoryTimelinePercent(categoryTimeline: CategoryTimelineDay[]): number {
  let max = 1;
  for (const day of categoryTimeline) {
    for (const category of day.categories) {
      max = Math.max(max, category.completionPercent);
    }
  }
  return max;
}

export function TrainingAnalyticsCategoryProgress({
  categories,
  categoryTimeline,
  periodFrom,
  periodTo,
  percentLabel = 'Прогресс',
}: TrainingAnalyticsCategoryProgressProps) {
  const timelineMax = useMemo(
    () => maxCategoryTimelinePercent(categoryTimeline),
    [categoryTimeline]
  );

  const timelineTicks = useMemo(() => {
    if (!categoryTimeline.length) return [];
    if (categoryTimeline.length <= 14) return categoryTimeline;
    const step = Math.ceil(categoryTimeline.length / 14);
    return categoryTimeline.filter(
      (_, index) => index % step === 0 || index === categoryTimeline.length - 1
    );
  }, [categoryTimeline]);

  const percentByCategoryDay = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const day of categoryTimeline) {
      map.set(day.date, new Map(day.categories.map((c) => [c.categoryId, c.completionPercent])));
    }
    return map;
  }, [categoryTimeline]);

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
      </p>

      <div className={styles.categoryProgressList}>
        {categories.map((category, index) => (
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
                  </span>
                )}
              </div>
              <span className={styles.categoryProgressValue}>
                {formatPercentWithSymbol(category.completionPercent)}
              </span>
            </div>
            <div className={styles.barTrack}>
              <TrainingAnalyticsBarFill
                percent={category.completionPercent}
                toneClass={chartToneClass(index)}
              />
            </div>
            <div
              className={styles.categoryTimelineChart}
              role="img"
              aria-label={`Динамика прохождения категории ${category.categoryName}`}
            >
              {timelineTicks.map((day) => {
                const percent = percentByCategoryDay.get(day.date)?.get(category.categoryId) ?? 0;
                return (
                  <div key={`${category.categoryId}-${day.date}`} className={styles.timelineGroup}>
                    <div className={styles.timelineBars}>
                      <TrainingAnalyticsTimelineBar
                        heightPercent={(percent / timelineMax) * 100}
                        variant="video"
                        title={`${formatShortDate(day.date)}: ${formatPercentWithSymbol(percent)}`}
                      />
                    </div>
                    <span className={styles.timelineLabel}>{formatShortDate(day.date)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
