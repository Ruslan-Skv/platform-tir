'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  type KnowledgeCategoryQuizResponse,
  type KnowledgeQuizSubmitResult,
  getKnowledgeCategoryQuiz,
  submitKnowledgeCategoryQuiz,
} from '@/shared/api/admin-knowledge';
import { KnowledgeSelfCheckQuizIcon } from '@/shared/ui/icons';

import styles from './KnowledgeCategoryQuiz.module.css';
import { KnowledgeQuizPassingRules } from './KnowledgeQuizPassingRules';
import { seedKnowledgeQuizPlatformSettingsCache } from './knowledge-quiz-platform-settings';
import { getQuizResultAdditionalExplanation } from './knowledgeQuizResultDisplay';
import { useKnowledgeQuizPlatformSettings } from './useKnowledgeQuizPlatformSettings';
import {
  formatBlockedCountdown,
  formatQuizCountdown,
  formatQuizDurationRu,
  getQuizTimeLimitSeconds,
  useBlockedCountdown,
  useKnowledgeQuizTimer,
} from './useKnowledgeQuizTimer';

type KnowledgeCategoryQuizProps = {
  categoryId: string;
  categoryName: string;
  questionCountHint: number;
  canStudy?: boolean;
};

function formatQuestionCount(count: number): string {
  if (count === 1) return '1 вопрос';
  if (count > 1 && count < 5) return `${count} вопроса`;
  return `${count} вопросов`;
}

export function KnowledgeCategoryQuiz({
  categoryId,
  categoryName,
  questionCountHint,
  canStudy = true,
}: KnowledgeCategoryQuizProps) {
  const [data, setData] = useState<KnowledgeCategoryQuizResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<KnowledgeQuizSubmitResult | null>(null);
  const [expanded, setExpanded] = useState(false);
  const answersRef = useRef(answers);
  const categoryIdRef = useRef(categoryId);
  answersRef.current = answers;
  categoryIdRef.current = categoryId;

  useEffect(() => {
    setExpanded(false);
    setResult(null);
    setAnswers({});
    setError(null);
  }, [categoryId]);

  const load = useCallback(async () => {
    const requestedCategoryId = categoryId;
    setLoading(true);
    setError(null);
    try {
      const quizData = await getKnowledgeCategoryQuiz(requestedCategoryId);
      if (categoryIdRef.current !== requestedCategoryId) return;

      setData(quizData);
      if (quizData?.quiz?.timePerQuestionSeconds != null) {
        seedKnowledgeQuizPlatformSettingsCache(quizData.quiz.timePerQuestionSeconds);
      }
      setAnswers({});
      setExpanded(false);
      setResult(null);
    } catch (e) {
      if (categoryIdRef.current !== requestedCategoryId) return;
      setError(e instanceof Error ? e.message : 'Ошибка загрузки теста');
      setData(null);
    } finally {
      if (categoryIdRef.current === requestedCategoryId) {
        setLoading(false);
      }
    }
  }, [categoryId]);

  useEffect(() => {
    void load();
  }, [load]);

  const platformSeconds = useKnowledgeQuizPlatformSettings();
  const isReady = !loading && data?.category.id === categoryId;
  const quiz = isReady ? (data?.quiz ?? null) : null;
  const displayQuestionCount = quiz?.questionCount ?? questionCountHint;
  const displayTitle = quiz?.title ?? `Итоговый тест: ${categoryName}`;
  const displayPassingScore = quiz?.passingScorePercent ?? 85;
  const displaySecondsPerQuestion = platformSeconds ?? quiz?.timePerQuestionSeconds ?? 60;
  const myBestAttempt = isReady ? (data?.myBestAttempt ?? null) : null;
  const attemptLimits = isReady ? data?.attemptLimits : null;
  const isAttemptBlocked = Boolean(isReady && attemptLimits && !attemptLimits.canStart);
  const blockedSecondsLeft = useBlockedCountdown(
    attemptLimits?.nextAttemptAt ?? null,
    isAttemptBlocked
  );

  const totalSeconds = quiz
    ? getQuizTimeLimitSeconds(quiz.questionCount, displaySecondsPerQuestion)
    : getQuizTimeLimitSeconds(displayQuestionCount, displaySecondsPerQuestion);
  const allQuestions = quiz?.sections.flatMap((section) => section.questions) ?? [];

  const submitQuiz = useCallback(
    async (timedOut: boolean) => {
      if (!quiz) return;

      if (!timedOut && !allQuestions.every((q) => answersRef.current[q.id])) {
        setError('Ответьте на все вопросы');
        return;
      }

      setSubmitting(true);
      setError(timedOut ? 'Время вышло. Ответы отправлены автоматически.' : null);
      try {
        const submitResult = await submitKnowledgeCategoryQuiz(categoryId, answersRef.current, {
          timedOut,
        });
        setResult(submitResult);
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка отправки');
      } finally {
        setSubmitting(false);
      }
    },
    [allQuestions, categoryId, load, quiz]
  );

  const onExpire = useCallback(() => {
    void submitQuiz(true);
  }, [submitQuiz]);

  const { secondsLeft, start, reset } = useKnowledgeQuizTimer(
    expanded && !result && isReady,
    totalSeconds,
    onExpire
  );

  useEffect(() => {
    if (isAttemptBlocked && blockedSecondsLeft === 0) {
      void load();
    }
  }, [blockedSecondsLeft, isAttemptBlocked, load]);

  if (isReady && (!quiz || quiz.questionCount === 0)) {
    return (
      <div className={styles.empty}>
        В этой категории пока нет материалов с тестами для объединённого прохождения.
      </div>
    );
  }

  const canSubmit = canStudy && isReady;
  const showIntro = !expanded && !result;
  const allAnswered = allQuestions.every((q) => answers[q.id]);
  const timerExpired = secondsLeft !== null && secondsLeft <= 0;

  const handleStart = () => {
    if (!isReady || isAttemptBlocked || loading) return;
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

  let questionIndex = 0;

  return (
    <section className={`${styles.section} ${loading && showIntro ? styles.sectionLoading : ''}`}>
      {showIntro ? (
        <div className={styles.introShell}>
          <div className={styles.header}>
            <div className={styles.headerIcon}>
              <KnowledgeSelfCheckQuizIcon size={40} />
            </div>
            <h2 className={styles.title}>{displayTitle}</h2>
            <KnowledgeQuizPassingRules
              passingScorePercent={displayPassingScore}
              secondsPerQuestion={displaySecondsPerQuestion}
              attemptLimits={attemptLimits}
              showAttemptsToday={Boolean(isReady && attemptLimits && !myBestAttempt?.passed)}
              attemptsPlaceholder
              dailyLimitVariant="category"
              extraRules={
                <li>
                  Итоговый тест объединяет все вопросы из материалов категории (
                  {formatQuestionCount(displayQuestionCount)}).
                </li>
              }
            />
            <div className={styles.bestScoreSlot}>
              {myBestAttempt ? (
                <div
                  className={`${styles.bestScore} ${myBestAttempt.passed ? styles.bestScorePassed : styles.bestScoreFailed}`}
                >
                  {myBestAttempt.passed ? '✓ Тест пройден' : 'Тест не пройден'} — лучший результат:{' '}
                  {myBestAttempt.scorePercent}%
                </div>
              ) : null}
            </div>
          </div>

          {error ? <div className={styles.error}>{error}</div> : null}

          {isReady && isAttemptBlocked && blockedSecondsLeft !== null ? (
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
              <div className={styles.blockedTimer}>
                {formatBlockedCountdown(blockedSecondsLeft)}
              </div>
            </div>
          ) : null}

          <div className={styles.collapsed}>
            <p className={styles.collapsedText}>
              На прохождение отведено{' '}
              {formatQuizDurationRu(
                getQuizTimeLimitSeconds(displayQuestionCount, displaySecondsPerQuestion)
              )}{' '}
              ({formatQuestionCount(displayQuestionCount)}). После начала запустится таймер. Вопросы
              сгруппированы по материалам категории.
            </p>
            {isReady && isAttemptBlocked ? (
              <p className={styles.hint}>Дождитесь окончания таймера, чтобы начать тест.</p>
            ) : (
              <button
                type="button"
                className={styles.startBtn}
                onClick={handleStart}
                disabled={!isReady || loading}
              >
                {loading ? 'Загрузка…' : 'Начать итоговый тест'}
              </button>
            )}
          </div>
        </div>
      ) : result ? (
        <>
          <div className={styles.header}>
            <div className={styles.headerIcon}>
              <KnowledgeSelfCheckQuizIcon size={40} />
            </div>
            <h2 className={styles.title}>{displayTitle}</h2>
          </div>

          {error ? <div className={styles.error}>{error}</div> : null}

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
              {result.results.map((item) => {
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
                    <p className={styles.resultQuestion}>{item.questionText}</p>
                    <p className={styles.resultAnswer}>
                      Ваш ответ: {item.selectedOptionText || '—'}
                    </p>
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
          </div>
        </>
      ) : quiz ? (
        <>
          <div className={styles.header}>
            <div className={styles.headerIcon}>
              <KnowledgeSelfCheckQuizIcon size={40} />
            </div>
            <h2 className={styles.title}>{displayTitle}</h2>
          </div>

          {error ? <div className={styles.error}>{error}</div> : null}

          <div
            className={`${styles.timer} ${secondsLeft !== null && secondsLeft <= 60 ? styles.timerWarning : ''}`}
          >
            Осталось: {formatQuizCountdown(secondsLeft ?? totalSeconds)}
          </div>

          <div className={styles.sections}>
            {quiz.sections.map((section) => (
              <div key={section.materialId} className={styles.sectionBlock}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>{section.materialTitle}</h3>
                  {section.moduleName ? (
                    <span className={styles.sectionModule}>{section.moduleName}</span>
                  ) : null}
                  <span className={styles.sectionQuestionCount}>
                    {formatQuestionCount(section.questions.length)}
                  </span>
                </div>
                <ol className={styles.questions}>
                  {section.questions.map((question) => {
                    questionIndex += 1;
                    const currentIndex = questionIndex;
                    return (
                      <li key={question.id} className={styles.question}>
                        <p className={styles.questionText}>
                          {currentIndex}. {question.text}
                        </p>
                        <div className={styles.options}>
                          {question.options.map((option) => (
                            <label key={option.id} className={styles.option}>
                              <input
                                type="radio"
                                name={`category-quiz-${question.id}`}
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
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>

          <button
            type="button"
            className={styles.submitBtn}
            onClick={() => void submitQuiz(false)}
            disabled={!canSubmit || submitting || !allAnswered || timerExpired}
          >
            {submitting ? 'Проверка…' : 'Проверить ответы'}
          </button>
        </>
      ) : null}
    </section>
  );
}
