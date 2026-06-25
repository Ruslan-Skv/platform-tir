'use client';

import { KnowledgeBackLink } from '../shared/KnowledgeBackLink';
import styles from './KnowledgePlatformFeedbackPage.module.css';
import type { KnowledgePlatformFeedbackPageModel } from './hooks/useKnowledgePlatformFeedbackPage';
import {
  FEEDBACK_TYPE_LABELS,
  formatFeedbackAuthor,
  formatFeedbackDate,
} from './knowledge-platform-feedback.utils';

type KnowledgePlatformFeedbackPageViewProps = {
  model: KnowledgePlatformFeedbackPageModel;
};

export function KnowledgePlatformFeedbackPageView({
  model,
}: KnowledgePlatformFeedbackPageViewProps) {
  const { items, loading, error, typeFilter, setTypeFilter, load, canEdit } = model;

  if (!canEdit) {
    return null;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <KnowledgeBackLink href="/admin/knowledge" className={styles.backLinkSlot}>
          ← Территория знаний
        </KnowledgeBackLink>
        <h1 className={styles.title}>Обратная связь по платформе</h1>
        <p className={styles.subtitle}>
          Предложения по улучшению и сообщения об ошибках от сотрудников. Данные хранятся в таблице{' '}
          <code>knowledge_platform_feedback</code> базы данных.
        </p>
      </header>

      <div className={styles.toolbar}>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className={styles.select}
          aria-label="Фильтр по типу сообщения"
        >
          <option value="">Все сообщения</option>
          <option value="SUGGESTION">Предложения</option>
          <option value="BUG">Ошибки</option>
        </select>
        <button
          type="button"
          className={styles.refreshButton}
          onClick={() => void load()}
          disabled={loading}
        >
          Обновить
        </button>
      </div>

      {loading ? <p className={styles.muted}>Загрузка…</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {!loading && !error && items.length === 0 ? (
        <p className={styles.muted}>Пока нет сообщений обратной связи.</p>
      ) : null}

      {!loading && items.length > 0 ? (
        <div className={styles.list}>
          {items.map((item) => (
            <article key={item.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span
                  className={`${styles.badge} ${item.type === 'BUG' ? styles.badgeBug : styles.badgeSuggestion}`}
                >
                  {FEEDBACK_TYPE_LABELS[item.type]}
                </span>
                <time className={styles.date} dateTime={item.createdAt}>
                  {formatFeedbackDate(item.createdAt)}
                </time>
              </div>
              <div className={styles.cardBody}>
                {item.author ? (
                  <p className={styles.author}>{formatFeedbackAuthor(item.author)}</p>
                ) : null}
                <p className={styles.text}>{item.text}</p>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
