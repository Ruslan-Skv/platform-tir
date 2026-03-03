'use client';

import React, { useCallback, useEffect, useState } from 'react';

import type { CreateReviewDto, Review, ReviewsSettings } from '@/shared/api/reviews';
import { createReview, getProductReviews, getReviewsSettings } from '@/shared/api/reviews';

import styles from './ProductReviewsSection.module.css';

interface ProductReviewsSectionProps {
  productId: string;
  productName: string;
  initialRating?: number;
  initialReviewsCount?: number;
  initialReviews?: Review[];
}

export const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({
  productId,
  productName,
  initialRating = 0,
  initialReviewsCount = 0,
  initialReviews = [],
}) => {
  const [settings, setSettings] = useState<ReviewsSettings | null>(null);
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [total, setTotal] = useState(initialReviewsCount);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(initialRating);
  const [reviewsCount, setReviewsCount] = useState(initialReviewsCount);

  const [formRating, setFormRating] = useState(5);
  const [formComment, setFormComment] = useState('');
  const [formUserName, setFormUserName] = useState('');
  const [formUserEmail, setFormUserEmail] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  useEffect(() => {
    getReviewsSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  const loadReviews = useCallback(
    async (pageNum = 1) => {
      if (!settings?.enabled) return;
      setLoading(true);
      try {
        const res = await getProductReviews(productId, pageNum, 5);
        setReviews(res.data);
        setTotal(res.total);
        setPage(pageNum);
        setRating(res.averageRating);
        setReviewsCount(res.total);
      } catch {
        setReviews([]);
      } finally {
        setLoading(false);
      }
    },
    [productId, initialRating, settings?.enabled]
  );

  useEffect(() => {
    if (settings?.enabled && page === 1 && initialReviews.length === 0) {
      loadReviews(1);
    } else if (initialReviews.length > 0) {
      setReviews(initialReviews);
      setTotal(initialReviewsCount);
      setReviewsCount(initialReviewsCount);
    }
  }, [settings?.enabled, initialReviews.length, initialReviewsCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings?.enabled) return;
    setFormError(null);
    setFormSubmitting(true);
    try {
      const dto: CreateReviewDto = {
        rating: formRating,
        comment: formComment.trim() || undefined,
      };
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('user_token') || localStorage.getItem('admin_token')
          : null;
      if (!token && settings.allowGuestReviews) {
        if (!formUserName.trim()) {
          setFormError('Укажите имя');
          return;
        }
        dto.userName = formUserName.trim();
        dto.userEmail = formUserEmail.trim() || undefined;
      }
      await createReview(productId, dto);
      setFormSuccess(true);
      setFormComment('');
      setFormRating(5);
      setFormUserName('');
      setFormUserEmail('');
      if (!settings.requireModeration) {
        await loadReviews(1);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Ошибка при отправке');
    } finally {
      setFormSubmitting(false);
    }
  };

  if (!settings?.enabled) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Отзывы о товаре</h2>

      <div className={styles.summary}>
        <div className={styles.ratingStars}>
          {'★'.repeat(Math.floor(rating))}
          {'☆'.repeat(5 - Math.floor(rating))}
        </div>
        <span className={styles.ratingValue}>
          {rating > 0 ? rating.toFixed(1) : '—'} ({reviewsCount}{' '}
          {reviewsCount === 1 ? 'отзыв' : reviewsCount < 5 ? 'отзыва' : 'отзывов'})
        </span>
      </div>

      <div className={styles.reviewsList}>
        {loading && reviews.length === 0 ? (
          <p className={styles.loading}>Загрузка отзывов...</p>
        ) : reviews.length === 0 ? (
          <p className={styles.empty}>Пока нет отзывов. Будьте первым!</p>
        ) : (
          <>
            {reviews.map((r) => (
              <article key={r.id} className={styles.reviewCard}>
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
                {r.adminReply && (
                  <div className={styles.adminReply}>
                    <span className={styles.adminReplyLabel}>Ответ магазина:</span>
                    <p className={styles.adminReplyContent}>{r.adminReply}</p>
                  </div>
                )}
              </article>
            ))}
            {total > page * 5 && (
              <button
                type="button"
                className={styles.loadMore}
                onClick={() => loadReviews(page + 1)}
                disabled={loading}
              >
                {loading ? 'Загрузка...' : 'Показать ещё'}
              </button>
            )}
          </>
        )}
      </div>

      {!formSuccess ? (
        <form className={styles.form} onSubmit={handleSubmit}>
          <h3 className={styles.formTitle}>Оставить отзыв</h3>
          <div className={styles.formRow}>
            <label className={styles.label}>Оценка:</label>
            <div className={styles.starsInput}>
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={styles.starButton}
                  onClick={() => setFormRating(s)}
                  aria-label={`${s} звёзд`}
                >
                  {s <= formRating ? '★' : '☆'}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.formRow}>
            <label htmlFor="review-comment" className={styles.label}>
              Комментарий (необязательно):
            </label>
            <textarea
              id="review-comment"
              className={styles.textarea}
              value={formComment}
              onChange={(e) => setFormComment(e.target.value)}
              rows={3}
              placeholder="Расскажите о товаре..."
            />
          </div>
          {!(
            typeof window !== 'undefined' &&
            (localStorage.getItem('user_token') || localStorage.getItem('admin_token'))
          ) &&
            settings.allowGuestReviews && (
              <>
                <div className={styles.formRow}>
                  <label htmlFor="review-name" className={styles.label}>
                    Ваше имя: *
                  </label>
                  <input
                    id="review-name"
                    type="text"
                    className={styles.input}
                    value={formUserName}
                    onChange={(e) => setFormUserName(e.target.value)}
                    required
                    placeholder="Иван"
                  />
                </div>
                <div className={styles.formRow}>
                  <label htmlFor="review-email" className={styles.label}>
                    Email (необязательно):
                  </label>
                  <input
                    id="review-email"
                    type="email"
                    className={styles.input}
                    value={formUserEmail}
                    onChange={(e) => setFormUserEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
              </>
            )}
          {formError && <p className={styles.formError}>{formError}</p>}
          <button type="submit" className={styles.submitButton} disabled={formSubmitting}>
            {formSubmitting ? 'Отправка...' : 'Отправить отзыв'}
          </button>
        </form>
      ) : (
        <p className={styles.success}>
          {settings.requireModeration
            ? 'Спасибо! Ваш отзыв отправлен на модерацию и будет опубликован после проверки.'
            : 'Спасибо за ваш отзыв!'}
        </p>
      )}
    </section>
  );
};
