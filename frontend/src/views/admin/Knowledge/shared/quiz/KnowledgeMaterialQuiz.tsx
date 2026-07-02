'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  type KnowledgeMaterialQuizResponse,
  type KnowledgeQuizSubmitResult,
  getKnowledgeMaterialQuiz,
  submitKnowledgeMaterialQuiz,
} from '@/shared/api/admin-knowledge';
import { KnowledgeSelfCheckQuizIcon } from '@/shared/ui/icons';

import styles from './KnowledgeMaterialQuiz.module.css';
import { KnowledgeQuizPassingRules } from './KnowledgeQuizPassingRules';
import { seedKnowledgeQuizPlatformSettingsCache } from './knowledge-quiz-platform-settings';
import { getQuizResultAdditionalExplanation } from './knowledgeQuizResultDisplay';
import {
  useKnowledgeQuizMaxAttemptsPerDay,
  useKnowledgeQuizRetryCooldownMinutes,
  useKnowledgeQuizTimePerQuestionSeconds,
} from './useKnowledgeQuizPlatformSettings';
import {
  formatBlockedCountdown,
  formatQuizCountdown,
  formatQuizDurationRu,
  getQuizTimeLimitSeconds,
  useBlockedCountdown,
  useKnowledgeQuizTimer,
} from './useKnowledgeQuizTimer';

type KnowledgeMaterialQuizProps = {
  materialId: string;
  materialStatus: string;
  canEdit: boolean;
  canStudy?: boolean;
  onQuizPassed?: () => void;
};

export function KnowledgeMaterialQuiz({
  materialId,
  materialStatus,
  canEdit,
  canStudy = false,
  onQuizPassed,
}: KnowledgeMaterialQuizProps) {
  const [data, setData] = useState<KnowledgeMaterialQuizResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<KnowledgeQuizSubmitResult | null>(null);
  const [expanded, setExpanded] = useState(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const quizData = await getKnowledgeMaterialQuiz(materialId);
      if (quizData?.quiz?.timePerQuestionSeconds != null) {
        seedKnowledgeQuizPlatformSettingsCache({
          materialQuizTimePerQuestionSeconds: quizData.quiz.timePerQuestionSeconds,
        });
      }
      setData(quizData);
      setAnswers({});
      setExpanded(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки теста');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [materialId]);

  useEffect(() => {
    void load();
  }, [load]);

  const platformSeconds = useKnowledgeQuizTimePerQuestionSeconds('material');
  const maxAttemptsFallback = useKnowledgeQuizMaxAttemptsPerDay('material');
  const cooldownFallback = useKnowledgeQuizRetryCooldownMinutes('material');
  const quiz = data?.quiz;
  const secondsPerQuestion = platformSeconds ?? quiz?.timePerQuestionSeconds ?? 60;
  const totalSeconds = quiz
    ? getQuizTimeLimitSeconds(quiz.questions.length, secondsPerQuestion)
    : 0;

  const submitQuiz = useCallback(
    async (timedOut: boolean) => {
      if (!quiz) return;

      if (!timedOut && !quiz.questions.every((q) => answersRef.current[q.id])) {
        setError('Ответьте на все вопросы');
        return;
      }

      setSubmitting(true);
      setError(timedOut ? 'Время вышло. Ответы отправлены автоматически.' : null);
      try {
        const submitResult = await submitKnowledgeMaterialQuiz(materialId, answersRef.current, {
          timedOut,
        });
        setResult(submitResult);
        if (submitResult.passed) {
          onQuizPassed?.();
        }
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка отправки');
      } finally {
        setSubmitting(false);
      }
    },
    [load, materialId, onQuizPassed, quiz]
  );

  const onExpire = useCallback(() => {
    void submitQuiz(true);
  }, [submitQuiz]);

  const { secondsLeft, start, reset } = useKnowledgeQuizTimer(
    expanded && !result,
    totalSeconds,
    onExpire
  );

  const attemptLimits = data?.attemptLimits;
  const isAttemptBlocked = Boolean(attemptLimits && !attemptLimits.canStart);
  const blockedSecondsLeft = useBlockedCountdown(
    attemptLimits?.nextAttemptAt ?? null,
    isAttemptBlocked
  );

  useEffect(() => {
    if (isAttemptBlocked && blockedSecondsLeft === 0) {
      void load();
    }
  }, [blockedSecondsLeft, isAttemptBlocked, load]);

  if (loading) {
    return null;
  }

  if (!quiz || !data || quiz.questions.length === 0) {
    return null;
  }

  const { myBestAttempt } = data;
  const canSubmit = (materialStatus === 'PUBLISHED' && canStudy) || canEdit;
  const allAnswered = quiz.questions.every((q) => answers[q.id]);
  const timerExpired = secondsLeft !== null && secondsLeft <= 0;

  const handleStart = () => {
    if (isAttemptBlocked) return;
    setExpanded(true);
    setAnswers({});
    setResult(null);
    setError(null);
    start();
  };

  const handleRetry = () => {
    if (isAttemptBlocked) return;
    setResult(null);
    setAnswers({});
    setError(null);
    setExpanded(false);
    reset();
  };

  return (
    <section className={styles.section} id="knowledge-quiz">
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <KnowledgeSelfCheckQuizIcon size={40} />
        </div>
        <h2 className={styles.title}>{quiz.title}</h2>
        <KnowledgeQuizPassingRules
          passingScorePercent={quiz.passingScorePercent}
          secondsPerQuestion={secondsPerQuestion}
          attemptLimits={attemptLimits}
          maxAttemptsPerDayFallback={maxAttemptsFallback ?? undefined}
          cooldownMinutesFallback={cooldownFallback ?? undefined}
          showAttemptsToday={Boolean(attemptLimits && !myBestAttempt?.passed)}
        />
        <p className={styles.subtitle}>Пройдите тест после прочтения материала.</p>
        {myBestAttempt ? (
          <div
            className={`${styles.bestScore} ${myBestAttempt.passed ? styles.bestScorePassed : styles.bestScoreFailed}`}
          >
            {myBestAttempt.passed ? '✓ Тест пройден' : 'Тест не пройден'} — лучший результат:{' '}
            {myBestAttempt.scorePercent}%
          </div>
        ) : null}
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}

      {isAttemptBlocked && blockedSecondsLeft !== null ? (
        <div className={styles.blockedNotice}>
          <p className={styles.blockedTitle}>
            {attemptLimits?.blockedReason === 'daily_limit'
              ? 'Лимит попыток на сегодня исчерпан'
              : 'Повторная попытка пока недоступна'}
          </p>
          <p className={styles.blockedText}>
            {attemptLimits?.blockedReason === 'daily_limit'
              ? 'Все попытки за сегодня оказались неуспешными. Следующая попытка будет доступна:'
              : `После неуспешного прохождения нужно подождать ${attemptLimits?.cooldownMinutes ?? 30} минут. Повторная попытка будет доступна через:`}
          </p>
          <div className={styles.blockedTimer}>{formatBlockedCountdown(blockedSecondsLeft)}</div>
        </div>
      ) : null}

      {result ? (
        <div className={styles.results}>
          <div
            className={`${styles.resultSummary} ${result.passed ? styles.resultPassed : styles.resultFailed}`}
          >
            <strong>
              {result.passed ? 'Отлично! Тест пройден.' : 'Пока не зачёт — попробуйте ещё раз.'}
            </strong>
            <span>
              Результат: {result.correctCount} из {result.totalCount} ({result.scorePercent}%)
            </span>
          </div>

          <ol className={styles.resultList}>
            {result.results.map((item, index) => {
              const additionalExplanation = item.isCorrect
                ? getQuizResultAdditionalExplanation(item.explanation, [
                    item.selectedOptionText,
                    item.correctOptionText,
                  ])
                : null;

              return (
                <li
                  key={item.questionId}
                  className={`${styles.resultItem} ${item.isCorrect ? styles.resultCorrect : styles.resultWrong}`}
                >
                  <p className={styles.resultQuestion}>
                    {index + 1}. {item.questionText}
                  </p>
                  <p className={styles.resultAnswer}>Ваш ответ: {item.selectedOptionText || '—'}</p>
                  <p
                    className={`${styles.resultStatus} ${item.isCorrect ? styles.resultStatusCorrect : styles.resultStatusWrong}`}
                  >
                    {item.isCorrect ? 'Верно' : 'Ошибка'}
                  </p>
                  {additionalExplanation ? (
                    <p className={styles.resultExplanation}>{additionalExplanation}</p>
                  ) : null}
                </li>
              );
            })}
          </ol>

          <button
            type="button"
            className={styles.retryBtn}
            onClick={handleRetry}
            disabled={isAttemptBlocked}
          >
            Пройти ещё раз
          </button>
          {!result.passed && isAttemptBlocked ? (
            <p className={styles.hint}>
              Кнопка станет активной, когда истечёт время ожидания (см. таймер выше).
            </p>
          ) : null}
        </div>
      ) : !expanded ? (
        <div className={styles.collapsed}>
          <p className={styles.collapsedText}>
            На прохождение теста отведено {formatQuizDurationRu(totalSeconds)} (
            {quiz.questions.length}{' '}
            {quiz.questions.length === 1
              ? 'вопрос'
              : quiz.questions.length < 5
                ? 'вопроса'
                : 'вопросов'}
            ). После начала запустится таймер.
          </p>
          {materialStatus !== 'PUBLISHED' && !canEdit ? (
            <p className={styles.hint}>Тест будет доступен после публикации материала.</p>
          ) : isAttemptBlocked ? (
            <p className={styles.hint}>Дождитесь окончания таймера, чтобы начать тест.</p>
          ) : (
            <button type="button" className={styles.startBtn} onClick={handleStart}>
              Начать тест
            </button>
          )}
        </div>
      ) : (
        <>
          <div
            className={`${styles.timer} ${secondsLeft !== null && secondsLeft <= 60 ? styles.timerWarning : ''}`}
          >
            Осталось: {formatQuizCountdown(secondsLeft ?? totalSeconds)}
          </div>

          <ol className={styles.questions}>
            {quiz.questions.map((question, index) => (
              <li key={question.id} className={styles.question}>
                <p className={styles.questionText}>
                  {index + 1}. {question.text}
                </p>
                <div className={styles.options}>
                  {question.options.map((option) => (
                    <label key={option.id} className={styles.option}>
                      <input
                        type="radio"
                        name={`quiz-${question.id}`}
                        value={option.id}
                        checked={answers[question.id] === option.id}
                        onChange={() =>
                          setAnswers((prev) => ({ ...prev, [question.id]: option.id }))
                        }
                        disabled={!canSubmit || submitting || timerExpired}
                      />
                      <span>{option.text}</span>
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ol>

          {materialStatus !== 'PUBLISHED' && !canEdit ? (
            <p className={styles.hint}>Тест будет доступен после публикации материала.</p>
          ) : (
            <button
              type="button"
              className={styles.submitBtn}
              onClick={() => void submitQuiz(false)}
              disabled={!canSubmit || submitting || !allAnswered || timerExpired}
            >
              {submitting ? 'Проверка…' : 'Проверить ответы'}
            </button>
          )}
        </>
      )}
    </section>
  );
}
