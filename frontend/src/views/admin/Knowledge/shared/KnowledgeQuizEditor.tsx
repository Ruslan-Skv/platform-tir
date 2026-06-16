'use client';

import { type MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';

import {
  type UpsertKnowledgeQuizDto,
  getKnowledgeMaterialQuiz,
  upsertKnowledgeMaterialQuiz,
} from '@/shared/api/admin-knowledge';

import styles from './KnowledgeQuizEditor.module.css';
import type { KnowledgeQuizEditorHandle } from './knowledge-quiz-editor.types';

export type { KnowledgeQuizEditorHandle } from './knowledge-quiz-editor.types';

type LocalOption = {
  key: string;
  text: string;
  isCorrect: boolean;
};

type LocalQuestion = {
  key: string;
  id?: string;
  text: string;
  explanation: string;
  options: LocalOption[];
};

type KnowledgeQuizEditorProps = {
  materialId: string;
  saveRef?: MutableRefObject<KnowledgeQuizEditorHandle | null>;
};

function newKey() {
  return `new_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function emptyQuestion(): LocalQuestion {
  return {
    key: newKey(),
    text: '',
    explanation: '',
    options: [
      { key: newKey(), text: '', isCorrect: true },
      { key: newKey(), text: '', isCorrect: false },
    ],
  };
}

function buildSnapshotFromValues(
  quizTitle: string,
  passingPercent: number,
  minutesPerQuestion: number,
  localQuestions: LocalQuestion[]
) {
  return JSON.stringify({
    title: quizTitle.trim() || 'Проверка знаний',
    passingScorePercent: passingPercent,
    timePerQuestionMinutes: minutesPerQuestion,
    questions: localQuestions.map((q, qIndex) => ({
      id: q.id,
      text: q.text,
      explanation: q.explanation || undefined,
      sortOrder: qIndex,
      options: q.options.map((o, oIndex) => ({
        text: o.text,
        isCorrect: o.isCorrect,
        sortOrder: oIndex,
      })),
    })),
  });
}

export function KnowledgeQuizEditor({ materialId, saveRef }: KnowledgeQuizEditorProps) {
  const [title, setTitle] = useState('Проверка знаний');
  const [passingScorePercent, setPassingScorePercent] = useState(85);
  const [timePerQuestionMinutes, setTimePerQuestionMinutes] = useState(1);
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [quizExists, setQuizExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const lastSavedSnapshotRef = useRef('');

  const buildSnapshot = useCallback(() => {
    return buildSnapshotFromValues(title, passingScorePercent, timePerQuestionMinutes, questions);
  }, [passingScorePercent, questions, timePerQuestionMinutes, title]);

  const syncSavedSnapshot = useCallback(() => {
    lastSavedSnapshotRef.current = buildSnapshot();
  }, [buildSnapshot]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getKnowledgeMaterialQuiz(materialId);
      if (data?.quiz) {
        const loadedQuestions = data.quiz.questions.map((q) => ({
          key: q.id,
          id: q.id,
          text: q.text,
          explanation: q.explanation || '',
          options: q.options.map((o) => ({
            key: o.id,
            text: o.text,
            isCorrect: Boolean(o.isCorrect),
          })),
        }));
        const loadedTitle = data.quiz.title;
        const loadedPassingScore = data.quiz.passingScorePercent;
        const loadedMinutes = data.quiz.timePerQuestionMinutes ?? 1;
        lastSavedSnapshotRef.current = buildSnapshotFromValues(
          loadedTitle,
          loadedPassingScore,
          loadedMinutes,
          loadedQuestions
        );
        setQuizExists(true);
        setTitle(loadedTitle);
        setPassingScorePercent(loadedPassingScore);
        setTimePerQuestionMinutes(loadedMinutes);
        setQuestions(loadedQuestions);
      } else {
        setQuizExists(false);
        setQuestions([]);
        lastSavedSnapshotRef.current = buildSnapshotFromValues('Проверка знаний', 85, 1, []);
      }
    } catch {
      setMessage({ type: 'error', text: 'Не удалось загрузить тест' });
    } finally {
      setLoading(false);
    }
  }, [materialId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async () => {
    if (questions.length === 0 && !quizExists) {
      syncSavedSnapshot();
      return;
    }

    const payload: UpsertKnowledgeQuizDto = JSON.parse(buildSnapshot());
    await upsertKnowledgeMaterialQuiz(materialId, payload);
    setQuizExists(questions.length > 0);
    syncSavedSnapshot();
  }, [materialId, buildSnapshot, questions.length, quizExists, syncSavedSnapshot]);

  const isDirty = useCallback(
    () => buildSnapshot() !== lastSavedSnapshotRef.current,
    [buildSnapshot]
  );

  useEffect(() => {
    if (!saveRef) return;
    if (loading) {
      saveRef.current = null;
      return;
    }
    saveRef.current = { save, isDirty };
    return () => {
      saveRef.current = null;
    };
  }, [save, isDirty, saveRef, loading]);

  const handleClear = () => {
    if (
      !confirm('Удалить тест для этой статьи? Изменения применятся после сохранения материала.')
    ) {
      return;
    }
    setQuestions([]);
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка теста…</div>;
  }

  return (
    <div className={styles.wrap}>
      <h2 className={styles.heading}>Тест после прочтения</h2>
      <p className={styles.hint}>
        Добавьте вопросы с вариантами ответов. В каждом вопросе отметьте один правильный вариант.
        Тест сохраняется вместе с материалом — кнопкой «Сохранить» в шапке страницы.
      </p>

      {message ? (
        <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>
      ) : null}

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Название теста</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.input}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Порог зачёта (%)</span>
          <input
            type="number"
            min={1}
            max={100}
            value={passingScorePercent}
            onChange={(e) => setPassingScorePercent(parseInt(e.target.value, 10) || 85)}
            className={styles.input}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Минут на вопрос</span>
          <input
            type="number"
            min={1}
            max={60}
            value={timePerQuestionMinutes}
            onChange={(e) => setTimePerQuestionMinutes(parseInt(e.target.value, 10) || 1)}
            className={styles.input}
          />
        </label>
      </div>

      {questions.map((question, qIndex) => (
        <div key={question.key} className={styles.question}>
          <div className={styles.questionHeader}>
            <strong>Вопрос {qIndex + 1}</strong>
            <button
              type="button"
              className={styles.removeBtn}
              onClick={() => setQuestions((prev) => prev.filter((q) => q.key !== question.key))}
            >
              Удалить
            </button>
          </div>
          <textarea
            value={question.text}
            onChange={(e) =>
              setQuestions((prev) =>
                prev.map((q) => (q.key === question.key ? { ...q, text: e.target.value } : q))
              )
            }
            className={styles.textarea}
            rows={2}
            placeholder="Текст вопроса"
          />
          <input
            type="text"
            value={question.explanation}
            onChange={(e) =>
              setQuestions((prev) =>
                prev.map((q) =>
                  q.key === question.key ? { ...q, explanation: e.target.value } : q
                )
              )
            }
            className={styles.input}
            placeholder="Пояснение после ответа (необязательно)"
          />
          <div className={styles.options}>
            {question.options.map((option) => (
              <div key={option.key} className={styles.optionRow}>
                <input
                  type="radio"
                  name={`correct-${question.key}`}
                  checked={option.isCorrect}
                  onChange={() =>
                    setQuestions((prev) =>
                      prev.map((q) =>
                        q.key === question.key
                          ? {
                              ...q,
                              options: q.options.map((o) => ({
                                ...o,
                                isCorrect: o.key === option.key,
                              })),
                            }
                          : q
                      )
                    )
                  }
                />
                <input
                  type="text"
                  value={option.text}
                  onChange={(e) =>
                    setQuestions((prev) =>
                      prev.map((q) =>
                        q.key === question.key
                          ? {
                              ...q,
                              options: q.options.map((o) =>
                                o.key === option.key ? { ...o, text: e.target.value } : o
                              ),
                            }
                          : q
                      )
                    )
                  }
                  className={styles.input}
                  placeholder="Вариант ответа"
                />
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() =>
                    setQuestions((prev) =>
                      prev.map((q) =>
                        q.key === question.key && q.options.length > 2
                          ? {
                              ...q,
                              options: q.options.filter((o) => o.key !== option.key),
                            }
                          : q
                      )
                    )
                  }
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className={styles.addOptionBtn}
              onClick={() =>
                setQuestions((prev) =>
                  prev.map((q) =>
                    q.key === question.key
                      ? {
                          ...q,
                          options: [...q.options, { key: newKey(), text: '', isCorrect: false }],
                        }
                      : q
                  )
                )
              }
            >
              + Вариант
            </button>
          </div>
        </div>
      ))}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
        >
          + Вопрос
        </button>
        {questions.length > 0 || quizExists ? (
          <button type="button" className={styles.dangerBtn} onClick={handleClear}>
            Удалить тест
          </button>
        ) : null}
      </div>
    </div>
  );
}
