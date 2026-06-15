'use client';

import type { QuizStepConfig } from '@/shared/api/quiz';

import styles from '../QuizWizard.module.css';

type TextStepProps = {
  step: QuizStepConfig;
  value: string;
  onChange: (value: string) => void;
};

export function TextStep({ step, value, onChange }: TextStepProps) {
  return (
    <input
      type="text"
      className={styles.textInput}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={step.placeholder ?? ''}
      autoFocus
    />
  );
}
