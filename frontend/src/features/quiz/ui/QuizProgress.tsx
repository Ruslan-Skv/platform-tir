'use client';

import styles from './QuizWizard.module.css';

type QuizProgressProps = {
  current: number;
  total: number;
  primaryColor: string;
};

export function QuizProgress({ current, total, primaryColor }: QuizProgressProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  const stepBoundaries =
    total > 1 ? Array.from({ length: total - 1 }, (_, index) => ((index + 1) / total) * 100) : [];

  return (
    <div className={styles.progressWrap}>
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${percent}%`, backgroundColor: primaryColor }}
        />
        {stepBoundaries.length > 0 ? (
          <div className={styles.progressTicks} aria-hidden>
            {stepBoundaries.map((leftPercent) => (
              <span
                key={leftPercent}
                className={styles.progressTick}
                style={{ left: `${leftPercent}%` }}
              />
            ))}
          </div>
        ) : null}
      </div>
      <span className={styles.progressLabel}>
        Шаг {current} из {total}
      </span>
    </div>
  );
}
