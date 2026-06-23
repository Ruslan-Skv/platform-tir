'use client';

import Link from 'next/link';

import styles from './CommentsSectionPage.module.css';
import type { CommentsSectionPageModel } from './hooks/useCommentsSectionPage';

type CommentsSectionPageViewProps = {
  model: CommentsSectionPageModel;
};

export function CommentsSectionPageView({ model }: CommentsSectionPageViewProps) {
  const {
    reviews,
    reviewsTotal,
    reviewsPage,
    reviewsLoading,
    actionLoading,
    replyLoading,
    replyText,
    setReplyText,
    toast,
    setToast,
    loadReviews,
    handleReviewAction,
    handleReviewReply,
  } = model;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Отзывы о товарах</h1>
        <p className={styles.subtitle}>
          Модерация отзывов и ответы покупателям. Комментарии к статьям раздела «Полезные статьи»
          отключены.
        </p>
      </header>

      {reviewsLoading && reviews.length === 0 ? (
        <p className={styles.loading}>Загрузка отзывов...</p>
      ) : reviews.length === 0 ? (
        <p className={styles.empty}>Отзывов пока нет</p>
      ) : (
        <div className={styles.list}>
          {reviews.map((r) => (
            <div key={r.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardAuthor}>{r.userName}</span>
                <span className={styles.cardDate}>
                  {new Date(r.createdAt).toLocaleString('ru-RU')}
                </span>
              </div>
              <div className={styles.reviewStars}>
                {'★'.repeat(r.rating)}
                {'☆'.repeat(5 - r.rating)}
              </div>
              {r.comment && <p className={styles.cardContent}>{r.comment}</p>}
              {r.product && (
                <p className={styles.cardMeta}>
                  Товар:{' '}
                  <Link
                    href={`/admin/catalog/products/${r.productId}/edit`}
                    className={styles.link}
                  >
                    {r.product.name}
                  </Link>
                </p>
              )}

              {r.adminReply && (
                <div className={styles.adminReply}>
                  <div className={styles.adminReplyLabel}>Ответ администратора</div>
                  <div className={styles.adminReplyContent}>{r.adminReply}</div>
                </div>
              )}

              <div className={styles.replyForm}>
                <textarea
                  className={styles.replyTextarea}
                  placeholder={
                    r.adminReply ? 'Изменить ответ администратора...' : 'Написать ответ на отзыв...'
                  }
                  value={replyText[r.id] ?? r.adminReply ?? ''}
                  onChange={(e) => setReplyText((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  rows={3}
                />
                <button
                  data-admin-mutation
                  type="button"
                  className={styles.replySubmit}
                  onClick={() => handleReviewReply(r.id)}
                  disabled={replyLoading === r.id}
                >
                  {replyLoading === r.id
                    ? 'Сохранение...'
                    : r.adminReply
                      ? 'Обновить ответ'
                      : 'Ответить'}
                </button>
              </div>

              <div className={styles.cardActions}>
                {!r.isApproved && (
                  <button
                    type="button"
                    className={styles.btnApprove}
                    onClick={() => handleReviewAction(r.id, 'approve')}
                    disabled={actionLoading === r.id}
                  >
                    Одобрить
                  </button>
                )}
                <button
                  data-admin-mutation
                  type="button"
                  className={styles.btnDelete}
                  onClick={() => {
                    if (confirm('Удалить отзыв?')) handleReviewAction(r.id, 'delete');
                  }}
                  disabled={actionLoading === r.id}
                >
                  Удалить
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
