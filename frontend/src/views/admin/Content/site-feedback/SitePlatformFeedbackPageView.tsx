'use client';

import Link from 'next/link';

import { getSafeHref } from '@/shared/lib/sanitize';

import styles from './SitePlatformFeedbackPage.module.css';
import type { SitePlatformFeedbackPageModel } from './hooks/useSitePlatformFeedbackPage';
import {
  FEEDBACK_TYPE_LABELS,
  formatFeedbackAuthor,
  formatFeedbackDate,
} from './site-platform-feedback.utils';

type SitePlatformFeedbackPageViewProps = {
  model: SitePlatformFeedbackPageModel;
};

export function SitePlatformFeedbackPageView({ model }: SitePlatformFeedbackPageViewProps) {
  const { items, loading, error, typeFilter, setTypeFilter, load, isSuperAdmin } = model;

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/admin/content/home" className={styles.backLinkSlot}>
          ← Контент сайта
        </Link>
        <h1 className={styles.title}>Обратная связь по сайту</h1>
        <p className={styles.subtitle}>
          Предложения по улучшению и сообщения об ошибках от посетителей публичного сайта. Данные
          хранятся в таблице <code>site_platform_feedback</code> базы данных.
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
                <p className={styles.author}>{formatFeedbackAuthor(item)}</p>
                {item.senderPhone ? (
                  <p className={styles.contactLine}>Телефон: {item.senderPhone}</p>
                ) : null}
                {item.author?.email ? (
                  <p className={styles.contactLine}>Аккаунт: {item.author.email}</p>
                ) : null}
                {item.pageUrl ? (
                  <p className={styles.pageUrl}>
                    Страница:{' '}
                    <a
                      href={getSafeHref(item.pageUrl, '#')}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.pageUrl}
                    </a>
                  </p>
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
