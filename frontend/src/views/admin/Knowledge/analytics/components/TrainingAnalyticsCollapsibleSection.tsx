'use client';

import { type ReactNode, useId, useState } from 'react';

import styles from '../KnowledgeTrainingAnalyticsPage.module.css';

type TrainingAnalyticsCollapsibleSectionProps = {
  title: string;
  hint?: string;
  badge?: string;
  defaultExpanded?: boolean;
  compact?: boolean;
  children: ReactNode;
  headerExtra?: ReactNode;
};

export function TrainingAnalyticsCollapsibleSection({
  title,
  hint,
  badge,
  defaultExpanded = false,
  compact = false,
  children,
  headerExtra,
}: TrainingAnalyticsCollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const contentId = useId();

  return (
    <section
      className={`${styles.card} ${compact ? styles.cardCompact : ''} ${expanded ? styles.cardExpanded : styles.cardCollapsed}`}
    >
      <button
        type="button"
        className={styles.collapsibleHeader}
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls={contentId}
      >
        <span className={styles.collapsibleChevron} aria-hidden>
          {expanded ? '▾' : '▸'}
        </span>
        <span className={styles.collapsibleHeaderMain}>
          <span className={styles.collapsibleTitleRow}>
            <h2 className={styles.cardTitle}>{title}</h2>
            {badge ? <span className={styles.collapsibleBadge}>{badge}</span> : null}
          </span>
          {hint && !expanded ? <span className={styles.collapsibleHintPreview}>{hint}</span> : null}
        </span>
        {headerExtra ? (
          <span className={styles.collapsibleHeaderExtra} onClick={(e) => e.stopPropagation()}>
            {headerExtra}
          </span>
        ) : null}
      </button>

      {expanded && (
        <div id={contentId} className={styles.collapsibleBody}>
          {hint && expanded ? <p className={styles.cardHint}>{hint}</p> : null}
          {children}
        </div>
      )}
    </section>
  );
}
