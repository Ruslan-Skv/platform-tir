'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type KnowledgeMaterialQuizResponse,
  type KnowledgeQuizSubmitResult,
  getKnowledgeMaterialQuiz,
  submitKnowledgeMaterialQuiz,
} from '@/shared/api/admin-knowledge';

import styles from './KnowledgeMaterialQuiz.module.css';

type KnowledgeMaterialQuizProps = {
  materialId: string;
  materialStatus: string;
  canEdit: boolean;
};

export function KnowledgeMaterialQuiz({
  materialId,
  materialStatus,
  canEdit,
}: KnowledgeMaterialQuizProps) {
  const [data, setData] = useState<KnowledgeMaterialQuizResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<KnowledgeQuizSubmitResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const quizData = await getKnowledgeMaterialQuiz(materialId);
      setData(quizData);
      setAnswers({});
      setResult(null);
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

  if (loading) {
    return <div className={styles.loading}>Загрузка теста…</div>;
  }

  if (!data?.quiz) {
    return null;
  }

  const { quiz, myBestAttempt } = data;
  const canSubmit = materialStatus === 'PUBLISHED' || canEdit;
  const allAnswered = quiz.questions.every((q) => answers[q.id]);

  const handleSubmit = async () => {
    if (!allAnswered) {
      setError('Ответьте на все вопросы');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const submitResult = await submitKnowledgeMaterialQuiz(materialId, answers);
      setResult(submitResult);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка отправки');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
    setAnswers({});
    setError(null);
  };

  return (
    <section className={styles.section} id="knowledge-quiz">
      <div className={styles.header}>
        <h2 className={styles.title}>{quiz.title}</h2>
        <p className={styles.subtitle}>
          Пройдите тест после прочтения материала. Для зачёта нужно не менее{' '}
          {quiz.passingScorePercent}% правильных ответов.
        </p>
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
            {result.results.map((item, index) => (
              <li
                key={item.questionId}
                className={`${styles.resultItem} ${item.isCorrect ? styles.resultCorrect : styles.resultWrong}`}
              >
                <p className={styles.resultQuestion}>
                  {index + 1}. {item.questionText}
                </p>
                <p className={styles.resultAnswer}>Ваш ответ: {item.selectedOptionText || '—'}</p>
                {!item.isCorrect ? (
                  <p className={styles.resultCorrectAnswer}>
                    Правильный ответ: {item.correctOptionText}
                  </p>
                ) : null}
                {item.explanation ? (
                  <p className={styles.resultExplanation}>{item.explanation}</p>
                ) : null}
              </li>
            ))}
          </ol>

          <button type="button" className={styles.retryBtn} onClick={handleRetry}>
            Пройти ещё раз
          </button>
        </div>
      ) : (
        <>
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
                        disabled={!canSubmit || submitting}
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
              onClick={() => void handleSubmit()}
              disabled={!canSubmit || submitting || !allAnswered}
            >
              {submitting ? 'Проверка…' : 'Проверить ответы'}
            </button>
          )}
        </>
      )}
    </section>
  );
}
