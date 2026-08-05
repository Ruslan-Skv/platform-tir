'use client';

import styles from './RepairSchedules.module.css';
import type { RepairDeadlineWarningLevel } from './repair-schedules';
import { deadlineWarningShortLabel } from './repair-schedules';

type Props = {
  level: RepairDeadlineWarningLevel | null | undefined;
  daysLeft?: number | null;
  className?: string;
};

export function RepairDeadlineWarningBadge({ level, daysLeft, className }: Props) {
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
