'use client';

import { ArrowDownTrayIcon, ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import type { AdminScreenshotItem } from '@/shared/api/screenshots/admin-screenshots';
import {
  downloadAdminScreenshot,
  fetchAdminScreenshotObjectUrl,
} from '@/shared/api/screenshots/admin-screenshots';
import { Button } from '@/shared/ui/Button';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Modal } from '@/shared/ui/Modal';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { AdminToolbarIconButton } from '@/shared/ui/admin/AdminToolbarIconButton';

import styles from './ScreenshotsPage.module.css';
import type { ScreenshotsFilter, ScreenshotsPageModel } from './hooks/useScreenshotsPage';

type ScreenshotsPageViewProps = {
  model: ScreenshotsPageModel;
};

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
}

/** Осталось до автоудаления (жизнь скриншота — 3 суток). */
function formatTtl(expiresAt: string, now: number): { text: string; soon: boolean } {
  const msLeft = new Date(expiresAt).getTime() - now;
  if (msLeft <= 0) return { text: 'удалит…', soon: true };
  const hours = Math.floor(msLeft / 3_600_000);
  const days = Math.floor(hours / 24);
  const soon = hours < 6;
  if (days >= 1) return { text: `удалится через ~${days} дн ${hours % 24} ч`, soon };
  if (hours >= 1) return { text: `удалится через ~${hours} ч`, soon };
  return { text: `удалится через ~${Math.max(1, Math.round(msLeft / 60_000))} мин`, soon: true };
}

function authorName(item: AdminScreenshotItem): string {
  const name = `${item.author.firstName || ''} ${item.author.lastName || ''}`.trim();
  return name || item.author.email;
}

/**
 * Картинка скриншота: файл закрыт авторизацией, поэтому грузим blob и показываем
 * через object URL (с отзывом при размонтировании).
 */
function ScreenshotImage({
  itemId,
  className,
  alt,
}: {
  itemId: string;
  className: string;
  alt: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setUrl(null);
    setFailed(false);
    void fetchAdminScreenshotObjectUrl(itemId)
      .then((nextUrl) => {
        if (cancelled) {
          URL.revokeObjectURL(nextUrl);
          return;
        }
        objectUrl = nextUrl;
        setUrl(nextUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [itemId]);

  if (failed) {
    return <span className={`${className} ${styles.empty}`}>Не удалось загрузить изображение</span>;
  }
  if (!url) {
    return <span className={`${className} ${styles.empty}`}>Загрузка…</span>;
  }
  return <img src={url} alt={alt} className={className} loading="lazy" />;
}

const FILTER_CHIPS: Array<{ value: ScreenshotsFilter; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: 'my', label: 'Мои' },
];

export function ScreenshotsPageView({ model }: ScreenshotsPageViewProps) {
  const {
    items,
    isLoading,
    error,
    isSuperAdmin,
    filter,
    setFilter,
    authorFilter,
    setAuthorFilter,
    authors,
    reload,
    now,
    deletingItem,
    requestDelete,
    confirmDelete,
    cancelDelete,
    deleteRunning,
    previewItem,
    openPreview,
    closePreview,
  } = model;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Скриншоты</h1>
          <p className={styles.subtitle}>
            Кнопка 📷 в шапке делает снимок экрана и сохраняет его сюда. Скриншоты видят суперадмин
            и сам автор, хранятся 3 суток.
          </p>
        </div>
      </div>

      <div className={styles.toolbar}>
        {isSuperAdmin && (
          <div className={styles.chips} role="tablist" aria-label="Фильтр скриншотов">
            {FILTER_CHIPS.map((chip) => (
              <button
                key={chip.value}
                type="button"
                role="tab"
                aria-selected={filter === chip.value}
                className={`${styles.chip} ${filter === chip.value ? styles.chipActive : ''}`}
                onClick={() => setFilter(chip.value)}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}
        {isSuperAdmin && filter === 'all' && (
          <select
            className={styles.authorSelect}
            value={authorFilter}
            onChange={(event) => setAuthorFilter(event.target.value)}
            aria-label="Автор скриншота"
          >
            <option value="">Все авторы</option>
            {authors.map((author) => (
              <option key={author.id} value={author.id}>
                {author.label}
              </option>
            ))}
          </select>
        )}
        <div className={styles.toolbarRight}>
          <span className={styles.count}>{isLoading ? 'Загрузка…' : `${items.length} шт.`}</span>
          <AdminToolbarIconButton onClick={reload} title="Обновить список">
            <ArrowPathIcon aria-hidden />
          </AdminToolbarIconButton>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {!error && !isLoading && items.length === 0 && (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📷</span>
          <span>Пока нет скриншотов.</span>
          <span>Нажмите кнопку с камерой в шапке админки, снять экран и отправить его сюда.</span>
        </div>
      )}

      {items.length > 0 && (
        <div className={styles.grid}>
          {items.map((item) => {
            const ttl = formatTtl(item.expiresAt, now);
            return (
              <article key={item.id} className={styles.card}>
                <button
                  type="button"
                  className={styles.thumbButton}
                  onClick={() => openPreview(item)}
                  title="Открыть скриншот"
                >
                  <ScreenshotImage
                    itemId={item.id}
                    className={styles.thumb}
                    alt={`Скриншот ${authorName(item)}`}
                  />
                </button>
                <div className={styles.cardMeta}>
                  <div className={styles.cardTop}>
                    <span className={styles.author} title={authorName(item)}>
                      {authorName(item)}
                    </span>
                    <span className={`${styles.ttl} ${ttl.soon ? styles.ttlSoon : ''}`}>
                      {ttl.text}
                    </span>
                  </div>
                  <span className={styles.date}>
                    {dateFormatter.format(new Date(item.createdAt))}
                  </span>
                  {item.comment && <p className={styles.comment}>{item.comment}</p>}
                  {item.pageUrl && (
                    <Link href={item.pageUrl} className={styles.pageLink}>
                      {item.pageUrl}
                    </Link>
                  )}
                </div>
                <div className={styles.cardActions}>
                  <span className={styles.size}>
                    {item.width && item.height ? `${item.width}×${item.height} · ` : ''}
                    {formatSize(item.fileSize)}
                  </span>
                  <span className={styles.actionsRow}>
                    <AdminTableIconButton
                      title="Скачать"
                      aria-label="Скачать скриншот"
                      onClick={() => void downloadAdminScreenshot(item)}
                    >
                      <ArrowDownTrayIcon aria-hidden />
                    </AdminTableIconButton>
                    <AdminTableIconButton
                      title="Удалить"
                      aria-label="Удалить скриншот"
                      onClick={() => requestDelete(item)}
                    >
                      <TrashIcon aria-hidden />
                    </AdminTableIconButton>
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={Boolean(previewItem)}
        onClose={closePreview}
        title="Скриншот"
        size="xl"
        alignTop
        compactOnMobile
      >
        {previewItem && (
          <div className={styles.previewBody}>
            <ScreenshotImage
              itemId={previewItem.id}
              className={styles.previewImage}
              alt="Скриншот"
            />
            <div className={styles.previewMeta}>
              <span>{authorName(previewItem)}</span>
              <span>{dateFormatter.format(new Date(previewItem.createdAt))}</span>
              <span>
                {previewItem.width && previewItem.height
                  ? `${previewItem.width}×${previewItem.height} пикс. · `
                  : ''}
                {formatSize(previewItem.fileSize)}
              </span>
              {previewItem.pageUrl && <span>{previewItem.pageUrl}</span>}
            </div>
            {previewItem.comment && <p className={styles.previewComment}>{previewItem.comment}</p>}
            <div className={styles.previewActions}>
              <Button variant="outline" onClick={() => void downloadAdminScreenshot(previewItem)}>
                Скачать
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  closePreview();
                  requestDelete(previewItem);
                }}
              >
                Удалить
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={Boolean(deletingItem)}
        onClose={cancelDelete}
        onConfirm={() => void confirmDelete()}
        title="Удалить скриншот?"
        message="Скриншот будет удалён безвозвратно."
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
        closeOnConfirm={false}
        confirmLoading={deleteRunning}
      />
    </div>
  );
}
