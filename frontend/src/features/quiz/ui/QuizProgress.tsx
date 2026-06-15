'use client';

import styles from './QuizWizard.module.css';

type QuizProgressProps = {
  current: number;
  total: number;
  primaryColor: string;
};

export function QuizProgress({ current, total, primaryColor }: QuizProgressProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className={styles.progressWrap}>
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${percent}%`, backgroundColor: primaryColor }}
        />
      </div>
      <span className={styles.progressLabel}>
        Шаг {current} из {total}
      </span>
    </div>
  );
}
