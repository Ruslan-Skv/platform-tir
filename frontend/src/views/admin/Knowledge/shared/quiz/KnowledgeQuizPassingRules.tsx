import type { ReactNode } from 'react';

import type { KnowledgeQuizAttemptLimits } from '@/shared/api/admin-knowledge';

import styles from './KnowledgeQuizPassingRules.module.css';
import { formatQuizDurationRu } from './useKnowledgeQuizTimer';

type KnowledgeQuizPassingRulesProps = {
  passingScorePercent: number;
  secondsPerQuestion: number;
  attemptLimits?: KnowledgeQuizAttemptLimits | null;
  maxAttemptsPerDayFallback?: number;
  cooldownMinutesFallback?: number;
  showAttemptsToday?: boolean;
  attemptsPlaceholder?: boolean;
  extraRules?: ReactNode;
  dailyLimitVariant?: 'material' | 'category';
};

export function KnowledgeQuizPassingRules({
  passingScorePercent,
  secondsPerQuestion,
  attemptLimits,
  maxAttemptsPerDayFallback,
  cooldownMinutesFallback,
  showAttemptsToday = false,
  attemptsPlaceholder = false,
  extraRules,
  dailyLimitVariant = 'material',
}: KnowledgeQuizPassingRulesProps) {
  const maxAttemptsPerDay = attemptLimits?.maxAttemptsPerDay ?? maxAttemptsPerDayFallback ?? 3;
  const cooldownMinutes = attemptLimits?.cooldownMinutes ?? cooldownMinutesFallback ?? 30;

  return (
    <div className={styles.rules}>
      <p className={styles.rulesTitle}>Правила прохождения</p>
      <ul className={styles.rulesList}>
        {extraRules}
        <li>
          Для зачёта нужно не менее {passingScorePercent}% правильных ответов. На каждый вопрос
          отводится {formatQuizDurationRu(secondsPerQuestion)}.
        </li>
        <li>
          После неуспешной попытки повторное прохождение возможно не ранее чем через{' '}
          {cooldownMinutes} минут.
        </li>
        {dailyLimitVariant === 'material' ? (
          <li>
            В сутки доступно не более {maxAttemptsPerDay} попыток. Если за день все{' '}
            {maxAttemptsPerDay} попытки оказались неуспешными, следующая попытка — только на
            следующий день.
          </li>
        ) : (
          <li>В сутки доступно не более {maxAttemptsPerDay} попыток.</li>
        )}
      </ul>
      {showAttemptsToday && attemptLimits ? (
        <p className={styles.rulesAttempts}>
          Попыток сегодня: {attemptLimits.attemptsToday} из {attemptLimits.maxAttemptsPerDay}
        </p>
      ) : attemptsPlaceholder ? (
        <p className={styles.rulesAttemptsPlaceholder} aria-hidden />
      ) : null}
    </div>
  );
}
