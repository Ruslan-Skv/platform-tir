'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type UpsertKnowledgeQuizDto,
  getKnowledgeMaterialQuiz,
  upsertKnowledgeMaterialQuiz,
} from '@/shared/api/admin-knowledge';

import styles from './KnowledgeQuizEditor.module.css';

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

export function KnowledgeQuizEditor({ materialId }: KnowledgeQuizEditorProps) {
  const [title, setTitle] = useState('Проверка знаний');
  const [passingScorePercent, setPassingScorePercent] = useState(85);
  const [timePerQuestionMinutes, setTimePerQuestionMinutes] = useState(1);
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getKnowledgeMaterialQuiz(materialId);
      if (data?.quiz) {
        setTitle(data.quiz.title);
        setPassingScorePercent(data.quiz.passingScorePercent);
        setTimePerQuestionMinutes(data.quiz.timePerQuestionMinutes ?? 1);
        setQuestions(
          data.quiz.questions.map((q) => ({
            key: q.id,
            id: q.id,
            text: q.text,
            explanation: q.explanation || '',
            options: q.options.map((o) => ({
              key: o.id,
              text: o.text,
              isCorrect: Boolean(o.isCorrect),
            })),
          }))
        );
      } else {
        setQuestions([]);
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

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload: UpsertKnowledgeQuizDto = {
        title: title.trim() || 'Проверка знаний',
        passingScorePercent,
        timePerQuestionMinutes,
        questions: questions.map((q, qIndex) => ({
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
      };
      await upsertKnowledgeMaterialQuiz(materialId, payload);
      setMessage({ type: 'success', text: 'Тест сохранён' });
      await load();
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Ошибка сохранения' });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Удалить тест для этой статьи?')) return;
    setSaving(true);
    try {
      await upsertKnowledgeMaterialQuiz(materialId, { questions: [] });
      setQuestions([]);
      setMessage({ type: 'success', text: 'Тест удалён' });
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Ошибка удаления' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка теста…</div>;
  }

  return (
    <div className={styles.wrap}>
      <h2 className={styles.heading}>Тест после прочтения</h2>
      <p className={styles.hint}>
        Добавьте вопросы с вариантами ответов. В каждом вопросе отметьте один правильный вариант.
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
        <button
          type="button"
          className={styles.saveBtn}
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? 'Сохранение…' : 'Сохранить тест'}
        </button>
        {questions.length > 0 ? (
          <button
            type="button"
            className={styles.dangerBtn}
            onClick={() => void handleClear()}
            disabled={saving}
          >
            Удалить тест
          </button>
        ) : null}
      </div>
    </div>
  );
}
