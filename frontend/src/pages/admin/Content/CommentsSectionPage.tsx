'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import type { AdminBlogComment } from '@/shared/api/admin-blog';
import {
  approveBlogComment,
  deleteBlogComment,
  getAdminBlogComments,
  markBlogCommentAsSpam,
  rejectBlogComment,
  replyToBlogComment,
} from '@/shared/api/admin-blog';
import type { AdminReview } from '@/shared/api/admin-reviews';
import {
  approveReview,
  deleteReview,
  getAdminReviews,
  replyToReview,
} from '@/shared/api/admin-reviews';

import styles from './CommentsSectionPage.module.css';

type Tab = 'blog' | 'reviews';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'На модерации',
  APPROVED: 'Одобрен',
  REJECTED: 'Отклонён',
  SPAM: 'Спам',
};

function getAuthorName(c: AdminBlogComment): string {
  if (c.author) {
    const parts = [c.author.firstName, c.author.lastName].filter(Boolean);
    return parts.length ? parts.join(' ') : 'Пользователь';
  }
  return c.authorName || 'Гость';
}

export function CommentsSectionPage() {
  const [tab, setTab] = useState<Tab>('blog');
  const [blogComments, setBlogComments] = useState<AdminBlogComment[]>([]);
  const [blogTotal, setBlogTotal] = useState(0);
  const [blogPage, setBlogPage] = useState(1);
  const [blogStatusFilter, setBlogStatusFilter] = useState<string>('');
  const [blogLoading, setBlogLoading] = useState(false);

  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [replyLoading, setReplyLoading] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadBlogComments = useCallback(
    async (page = 1) => {
      setBlogLoading(true);
      try {
        const res = await getAdminBlogComments({
          status: blogStatusFilter || undefined,
          page,
          limit: 20,
        });
        setBlogComments(res.data);
        setBlogTotal(res.total);
        setBlogPage(page);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Ошибка загрузки', 'error');
        setBlogComments([]);
      } finally {
        setBlogLoading(false);
      }
    },
    [blogStatusFilter, showToast]
  );

  const loadReviews = useCallback(
    async (page = 1) => {
      setReviewsLoading(true);
      try {
        const res = await getAdminReviews(page, 20);
        setReviews(res.data);
        setReviewsTotal(res.total);
        setReviewsPage(page);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Ошибка загрузки', 'error');
        setReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    if (tab === 'blog') loadBlogComments(blogPage);
  }, [tab, blogStatusFilter, blogPage, loadBlogComments]);

  useEffect(() => {
    if (tab === 'reviews') loadReviews(reviewsPage);
  }, [tab, reviewsPage, loadReviews]);

  const handleBlogAction = async (id: string, action: 'approve' | 'reject' | 'spam' | 'delete') => {
    setActionLoading(id);
    try {
      if (action === 'approve') await approveBlogComment(id);
      else if (action === 'reject') await rejectBlogComment(id);
      else if (action === 'spam') await markBlogCommentAsSpam(id);
      else await deleteBlogComment(id);
      showToast(action === 'delete' ? 'Комментарий удалён' : 'Действие выполнено', 'success');
      loadBlogComments(blogPage);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlogReply = async (id: string) => {
    const content = (replyText[id] ?? '').trim();
    if (!content) {
      showToast('Введите текст ответа', 'error');
      return;
    }
    setReplyLoading(id);
    try {
      await replyToBlogComment(id, content);
      setReplyText((prev) => ({ ...prev, [id]: '' }));
      showToast('Ответ отправлен', 'success');
      loadBlogComments(blogPage);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка отправки', 'error');
    } finally {
      setReplyLoading(null);
    }
  };

  const handleReviewAction = async (id: string, action: 'approve' | 'delete') => {
    setActionLoading(id);
    try {
      if (action === 'approve') await approveReview(id);
      else await deleteReview(id);
      showToast(action === 'delete' ? 'Отзыв удалён' : 'Отзыв одобрен', 'success');
      loadReviews(reviewsPage);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReviewReply = async (id: string) => {
    const content = (replyText[id] ?? '').trim();
    setReplyLoading(id);
    try {
      await replyToReview(id, content);
      setReplyText((prev) => ({ ...prev, [id]: '' }));
      showToast('Ответ сохранён', 'success');
      setReviews((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                adminReply: content || null,
                adminReplyAt: content ? new Date().toISOString() : null,
              }
            : r
        )
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка сохранения', 'error');
    } finally {
      setReplyLoading(null);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Комментарии и отзывы</h1>
        <p className={styles.subtitle}>
          Управление комментариями к статьям блога и отзывами о товарах. Модерация и ответы.
        </p>
      </header>

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'blog' ? styles.active : ''}`}
          onClick={() => setTab('blog')}
        >
          Комментарии блога
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'reviews' ? styles.active : ''}`}
          onClick={() => setTab('reviews')}
        >
          Отзывы о товарах
        </button>
      </div>

      {tab === 'blog' && (
        <>
          <div className={styles.filters}>
            <select
              className={styles.filterSelect}
              value={blogStatusFilter}
              onChange={(e) => {
                setBlogStatusFilter(e.target.value);
                setBlogPage(1);
              }}
            >
              <option value="">Все статусы</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {blogLoading && blogComments.length === 0 ? (
            <p className={styles.loading}>Загрузка комментариев...</p>
          ) : blogComments.length === 0 ? (
            <p className={styles.empty}>Комментариев пока нет</p>
          ) : (
            <div className={styles.list}>
              {blogComments.map((c) => (
                <div key={c.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardAuthor}>
                      {getAuthorName(c)}
                      <span
                        className={`${styles.statusBadge} ${
                          c.status === 'PENDING'
                            ? styles.statusPending
                            : c.status === 'APPROVED'
                              ? styles.statusApproved
                              : c.status === 'REJECTED'
                                ? styles.statusRejected
                                : c.status === 'SPAM'
                                  ? styles.statusSpam
                                  : ''
                        }`}
                      >
                        {STATUS_LABELS[c.status] ?? c.status}
                      </span>
                    </span>
                    <span className={styles.cardDate}>
                      {new Date(c.createdAt).toLocaleString('ru-RU')}
                    </span>
                  </div>
                  <p className={styles.cardContent}>{c.content}</p>
                  <p className={styles.cardMeta}>
                    Статья:{' '}
                    <Link
                      href={`/blog/${c.post.slug}`}
                      className={styles.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {c.post.title}
                    </Link>
                  </p>

                  {c.replies && c.replies.length > 0 && (
                    <div className={styles.replies}>
                      {c.replies.map((r) => (
                        <div key={r.id} className={styles.reply}>
                          <div className={styles.replyAuthor}>
                            {r.author
                              ? [r.author.firstName, r.author.lastName].filter(Boolean).join(' ') ||
                                'Админ'
                              : 'Ответ'}
                          </div>
                          <div className={styles.replyContent}>{r.content}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className={styles.replyForm}>
                    <textarea
                      className={styles.replyTextarea}
                      placeholder="Написать ответ..."
                      value={replyText[c.id] ?? ''}
                      onChange={(e) =>
                        setReplyText((prev) => ({ ...prev, [c.id]: e.target.value }))
                      }
                      rows={3}
                    />
                    <button
                      type="button"
                      className={styles.replySubmit}
                      onClick={() => handleBlogReply(c.id)}
                      disabled={replyLoading === c.id}
                    >
                      {replyLoading === c.id ? 'Отправка...' : 'Ответить'}
                    </button>
                  </div>

                  <div className={styles.cardActions}>
                    {c.status !== 'APPROVED' && (
                      <button
                        type="button"
                        className={styles.btnApprove}
                        onClick={() => handleBlogAction(c.id, 'approve')}
                        disabled={actionLoading === c.id}
                      >
                        Одобрить
                      </button>
                    )}
                    {c.status !== 'REJECTED' && (
                      <button
                        type="button"
                        className={styles.btnReject}
                        onClick={() => handleBlogAction(c.id, 'reject')}
                        disabled={actionLoading === c.id}
                      >
                        Отклонить
                      </button>
                    )}
                    {c.status !== 'SPAM' && (
                      <button
                        type="button"
                        className={styles.btnSpam}
                        onClick={() => handleBlogAction(c.id, 'spam')}
                        disabled={actionLoading === c.id}
                      >
                        Спам
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.btnDelete}
                      onClick={() => {
                        if (confirm('Удалить комментарий?')) handleBlogAction(c.id, 'delete');
                      }}
                      disabled={actionLoading === c.id}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {blogTotal > 20 && (
            <div className={styles.pagination}>
              <button
                type="button"
                className={styles.pageButton}
                disabled={blogPage <= 1 || blogLoading}
                onClick={() => loadBlogComments(blogPage - 1)}
              >
                ← Назад
              </button>
              <span className={styles.pageInfo}>
                Страница {blogPage} из {Math.ceil(blogTotal / 20)}
              </span>
              <button
                type="button"
                className={styles.pageButton}
                disabled={blogPage >= Math.ceil(blogTotal / 20) || blogLoading}
                onClick={() => loadBlogComments(blogPage + 1)}
              >
                Вперёд →
              </button>
            </div>
          )}
        </>
      )}

      {tab === 'reviews' && (
        <>
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
                        r.adminReply
                          ? 'Изменить ответ администратора...'
                          : 'Написать ответ на отзыв...'
                      }
                      value={replyText[r.id] ?? r.adminReply ?? ''}
                      onChange={(e) =>
                        setReplyText((prev) => ({ ...prev, [r.id]: e.target.value }))
                      }
                      rows={3}
                    />
                    <button
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
        </>
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
