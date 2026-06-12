'use client';

import { useCallback, useEffect, useState } from 'react';

import type { AdminReview } from '@/shared/api/admin-reviews';
import {
  approveReview,
  deleteReview,
  getAdminReviews,
  replyToReview,
} from '@/shared/api/admin-reviews';

export function useCommentsSectionPage() {
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
    loadReviews(1);
  }, [loadReviews]);

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

  return {
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
  };
}

export type CommentsSectionPageModel = ReturnType<typeof useCommentsSectionPage>;
