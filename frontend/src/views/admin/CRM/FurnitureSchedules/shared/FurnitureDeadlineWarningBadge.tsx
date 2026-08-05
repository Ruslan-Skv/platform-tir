'use client';

import styles from './FurnitureSchedules.module.css';
import type { FurnitureDeadlineWarningLevel } from './furniture-schedules';
import { deadlineWarningShortLabel } from './furniture-schedules';

type Props = {
  level: FurnitureDeadlineWarningLevel | null | undefined;
  daysLeft?: number | null;
  className?: string;
};

export function FurnitureDeadlineWarningBadge({ level, daysLeft, className }: Props) {
  if (!level) return null;
  const toneClass =
    level === 'OVERDUE' || level === 'D3'
      ? styles.deadlineWarnUrgent
      : level === 'D10'
        ? styles.deadlineWarnHigh
        : styles.deadlineWarnSoft;
  return (
    <span className={`${styles.deadlineWarn} ${toneClass}${className ? ` ${className}` : ''}`}>
      {deadlineWarningShortLabel(level, daysLeft)}
    </span>
  );
}
