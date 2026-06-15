'use client';

import type { QuizPublicConfig } from '@/shared/api/quiz';

import styles from './QuizWizard.module.css';

type SuccessScreenProps = {
  config: QuizPublicConfig;
  primaryColor: string;
};

export function SuccessScreen({ config, primaryColor }: SuccessScreenProps) {
  return (
    <div className={styles.success}>
      <div className={styles.successIcon} style={{ color: primaryColor }}>
        ✓
      </div>
      <h2 className={styles.successTitle}>{config.successTitle || 'Спасибо!'}</h2>
      {config.successText ? <p className={styles.successText}>{config.successText}</p> : null}
      {config.catalogFileUrl ? (
        <a
          href={config.catalogFileUrl}
          className={styles.catalogButton}
          style={{ backgroundColor: primaryColor }}
          target="_blank"
          rel="noopener noreferrer"
        >
          Скачать каталог
        </a>
      ) : null}
    </div>
  );
}
