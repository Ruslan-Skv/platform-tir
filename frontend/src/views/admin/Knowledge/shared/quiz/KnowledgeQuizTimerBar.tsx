'use client';

import styles from './KnowledgeQuizTimerBar.module.css';
import { formatQuizCountdown } from './useKnowledgeQuizTimer';

type KnowledgeQuizTimerBarProps = {
  secondsLeft: number | null;
  totalSeconds: number;
};

export function KnowledgeQuizTimerBar({ secondsLeft, totalSeconds }: KnowledgeQuizTimerBarProps) {
  const displaySeconds = secondsLeft ?? totalSeconds;
  const isWarning = secondsLeft !== null && secondsLeft <= 60;

  return (
    <div className={styles.timerAnchor}>
      <div className={styles.timerSpacer} aria-hidden />
      <div
        className={`${styles.timerBar} ${isWarning ? styles.timerBarWarning : ''}`}
        role="timer"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className={styles.timerLabel}>Осталось:</span>
        <span className={styles.timerValue}>{formatQuizCountdown(displaySeconds)}</span>
      </div>
    </div>
  );
}
