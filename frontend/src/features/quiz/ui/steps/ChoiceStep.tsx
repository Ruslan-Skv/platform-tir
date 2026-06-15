'use client';

import { resolveQuizImageUrl } from '@/features/quiz/lib/quiz-theme';
import type { QuizStepConfig } from '@/shared/api/quiz';

import styles from '../QuizWizard.module.css';

type ChoiceStepProps = {
  step: QuizStepConfig;
  value: string;
  onChange: (value: string) => void;
};

export function ChoiceStep({ step, value, onChange }: ChoiceStepProps) {
  return (
    <div className={styles.choiceGrid}>
      {step.options?.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className={`${styles.choiceCard} ${selected ? styles.choiceCardSelected : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.imageUrl ? (
              <img
                src={resolveQuizImageUrl(option.imageUrl)}
                alt=""
                className={styles.choiceImage}
              />
            ) : (
              <span className={styles.choicePlaceholder} aria-hidden />
            )}
            <span className={styles.choiceLabel}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
