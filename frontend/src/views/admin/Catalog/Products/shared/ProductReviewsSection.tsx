'use client';

import React, { useCallback, useEffect, useState } from 'react';

import { approveReview, deleteReview, getAdminReviews } from '@/shared/api/admin-reviews';
import type { AdminReview } from '@/shared/api/admin-reviews';

import styles from './ProductReviewsSection.module.css';

interface ProductReviewsSectionProps {
  productId: string;
}

export function ProductReviewsSection({ productId }: ProductReviewsSectionProps) {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadReviews = useCallback(
    async (pageNum = 1) => {
      setLoading(true);
      try {
        const res = await getAdminReviews(pageNum, 10, productId);
        setReviews(res.data);
        setTotal(res.total);
        setPage(pageNum);
      } catch (err) {
        console.error(err);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    },
    [productId]
  );

  useEffect(() => {
    loadReviews(1);
  }, [loadReviews]);

  const handleApprove = async (reviewId: string) => {
    setActionLoading(reviewId);
    try {
      await approveReview(reviewId);
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, isApproved: true } : r)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка');
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
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className={styles.section}>
      <h2 className={styles.title}>Отзывы о товаре</h2>
      {loading && reviews.length === 0 ? (
        <p className={styles.loading}>Загрузка отзывов...</p>
      ) : reviews.length === 0 ? (
        <p className={styles.empty}>Отзывов пока нет</p>
      ) : (
        <>
          <div className={styles.list}>
            {reviews.map((r) => (
              <div key={r.id} className={styles.card}>
                <div className={styles.header}>
                  <span className={styles.author}>{r.userName}</span>
                  <span className={styles.date}>
                    {new Date(r.createdAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <div className={styles.stars}>
                  {'★'.repeat(r.rating)}
                  {'☆'.repeat(5 - r.rating)}
                </div>
                {r.comment && <p className={styles.comment}>{r.comment}</p>}
                <div className={styles.actions}>
                  {!r.isApproved && (
                    <button
                      type="button"
                      className={styles.approveBtn}
                      onClick={() => handleApprove(r.id)}
                      disabled={actionLoading === r.id}
                    >
                      {actionLoading === r.id ? '...' : 'Одобрить'}
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(r.id)}
                    disabled={actionLoading === r.id}
                  >
                    {actionLoading === r.id ? '...' : 'Удалить'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {total > 10 && (
            <div className={styles.pagination}>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={page <= 1 || loading}
                onClick={() => loadReviews(page - 1)}
              >
                ← Назад
              </button>
              <span className={styles.pageInfo}>
                Страница {page} из {Math.ceil(total / 10)}
              </span>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={page >= Math.ceil(total / 10) || loading}
                onClick={() => loadReviews(page + 1)}
              >
                Вперёд →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
