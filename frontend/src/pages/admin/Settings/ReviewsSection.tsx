'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import type { AdminReview, ReviewsBlockSettings } from '@/shared/api/admin-reviews';
import {
  approveReview,
  deleteReview,
  getAdminReviews,
  getAdminReviewsSettings,
  updateAdminReviewsSettings,
} from '@/shared/api/admin-reviews';

import styles from './ReviewsSection.module.css';

export function ReviewsSection() {
  const [settings, setSettings] = useState<ReviewsBlockSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const data = await getAdminReviewsSettings();
      setSettings(data);
    } catch (err) {
      console.error(err);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReviews = useCallback(async (page = 1) => {
    setReviewsLoading(true);
    try {
      const res = await getAdminReviews(page, 20);
      setReviews(res.data);
      setReviewsTotal(res.total);
      setReviewsPage(page);
    } catch (err) {
      console.error(err);
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    loadReviews(1);
  }, [loadReviews]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setToast(null);
    try {
      await updateAdminReviewsSettings(settings);
      showToast('Настройки сохранены', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка сохранения', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (reviewId: string) => {
    setActionLoading(reviewId);
    try {
      await approveReview(reviewId);
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, isApproved: true } : r)));
      showToast('Отзыв одобрен', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Удалить этот отзыв?')) return;
    setActionLoading(reviewId);
    try {
      await deleteReview(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setReviewsTotal((t) => Math.max(0, t - 1));
      showToast('Отзыв удалён', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading || !settings) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Загрузка настроек...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Настройки отзывов и оценок</h2>
        <p className={styles.sectionDescription}>
          Управление функциональностью отзывов на товары: включение/отключение, модерация,
          ограничения для гостей и покупателей.
        </p>
        <form onSubmit={handleSaveSettings} className={styles.form}>
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="enabled"
              checked={settings.enabled}
              onChange={(e) => setSettings((s) => (s ? { ...s, enabled: e.target.checked } : s))}
            />
            <label htmlFor="enabled">Включить отзывы и оценки</label>
          </div>
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="showOnCards"
              checked={settings.showOnCards}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, showOnCards: e.target.checked } : s))
              }
            />
            <label htmlFor="showOnCards">Показывать рейтинг на карточках товаров</label>
          </div>
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="requirePurchase"
              checked={settings.requirePurchase}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, requirePurchase: e.target.checked } : s))
              }
            />
            <label htmlFor="requirePurchase">Только покупатели могут оставлять отзывы</label>
          </div>
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="allowGuestReviews"
              checked={settings.allowGuestReviews}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, allowGuestReviews: e.target.checked } : s))
              }
            />
            <label htmlFor="allowGuestReviews">Разрешить гостям оставлять отзывы</label>
          </div>
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="requireModeration"
              checked={settings.requireModeration}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, requireModeration: e.target.checked } : s))
              }
            />
            <label htmlFor="requireModeration">Требовать модерацию перед публикацией</label>
          </div>
          <button type="submit" className={styles.saveButton} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить настройки'}
          </button>
        </form>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Модерация отзывов</h2>
        <p className={styles.sectionDescription}>
          Одобряйте или удаляйте отзывы. Отзывы с модерацией появятся на сайте только после
          одобрения.
        </p>
        {reviewsLoading && reviews.length === 0 ? (
          <p className={styles.loading}>Загрузка отзывов...</p>
        ) : reviews.length === 0 ? (
          <p className={styles.empty}>Отзывов пока нет</p>
        ) : (
          <div className={styles.reviewsList}>
            {reviews.map((r) => (
              <div key={r.id} className={styles.reviewCard}>
                <div className={styles.reviewHeader}>
                  <span className={styles.reviewAuthor}>{r.userName}</span>
                  <span className={styles.reviewDate}>
                    {new Date(r.createdAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <div className={styles.reviewStars}>
                  {'★'.repeat(r.rating)}
                  {'☆'.repeat(5 - r.rating)}
                </div>
                {r.comment && <p className={styles.reviewComment}>{r.comment}</p>}
                {r.product && (
                  <p className={styles.reviewProduct}>
                    Товар:{' '}
                    <Link
                      href={`/admin/catalog/products/${r.productId}/edit`}
                      className={styles.productLink}
                    >
                      {r.product.name}
                    </Link>
                  </p>
                )}
                <div className={styles.reviewActions}>
                  {!r.isApproved && (
                    <button
                      type="button"
                      className={styles.approveButton}
                      onClick={() => handleApprove(r.id)}
                      disabled={actionLoading === r.id}
                    >
                      {actionLoading === r.id ? '...' : 'Одобрить'}
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => handleDelete(r.id)}
                    disabled={actionLoading === r.id}
                  >
                    {actionLoading === r.id ? '...' : 'Удалить'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {reviewsTotal > 20 && (
          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageButton}
              disabled={reviewsPage <= 1 || reviewsLoading}
              onClick={() => loadReviews(reviewsPage - 1)}
            >
              ← Назад
            </button>
            <span className={styles.pageInfo}>
              Страница {reviewsPage} из {Math.ceil(reviewsTotal / 20)}
            </span>
            <button
              type="button"
              className={styles.pageButton}
              disabled={reviewsPage >= Math.ceil(reviewsTotal / 20) || reviewsLoading}
              onClick={() => loadReviews(reviewsPage + 1)}
            >
              Вперёд →
            </button>
          </div>
        )}
      </section>

      {toast && (
        <div
          className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}
          role="alert"
        >
          <span className={styles.toastIcon}>{toast.type === 'success' ? '✓' : '⚠'}</span>
          <span className={styles.toastMessage}>{toast.message}</span>
          <button
            type="button"
            className={styles.toastClose}
            onClick={() => setToast(null)}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
