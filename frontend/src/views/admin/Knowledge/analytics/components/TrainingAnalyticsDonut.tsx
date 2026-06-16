import type { CSSProperties, ReactNode } from 'react';

import styles from '../KnowledgeTrainingAnalyticsPage.module.css';

type TrainingAnalyticsDonutProps = {
  completedPercent: number;
  inProgressPercent: number;
  children: ReactNode;
};

export function TrainingAnalyticsDonut({
  completedPercent,
  inProgressPercent,
  children,
}: TrainingAnalyticsDonutProps) {
  const donutStyle = {
    '--completed': `${completedPercent}%`,
    '--in-progress': `${inProgressPercent}%`,
  } as CSSProperties;

  return (
    <div className={styles.donut} style={donutStyle}>
      {children}
    </div>
  );
}
