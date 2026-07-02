'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type KnowledgeMaterialComment,
  createKnowledgeMaterialComment,
  getKnowledgeMaterialComments,
} from '@/shared/api/admin-knowledge';
import { getAvatarUrl } from '@/shared/lib/avatar';
import { CommentIcon } from '@/shared/ui/icons';

import { formatDate, formatKnowledgeLikerLabel } from '../knowledge-utils';
import styles from './KnowledgeMaterialComments.module.css';
import { KNOWLEDGE_MATERIAL_COMMENTS_SECTION_ID } from './knowledge-comments.constants';

type KnowledgeMaterialCommentsProps = {
  materialId: string;
  materialStatus: string;
  canParticipate: boolean;
  initialCommentCount?: number;
  onCommentCountChange?: (count: number) => void;
};

export function KnowledgeMaterialComments({
  materialId,
  materialStatus,
  canParticipate,
  initialCommentCount = 0,
  onCommentCountChange,
}: KnowledgeMaterialCommentsProps) {
  const canShowComments = materialStatus === 'PUBLISHED';
  const canWriteComments = canShowComments && canParticipate;
  const [comments, setComments] = useState<KnowledgeMaterialComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [commentCount, setCommentCount] = useState(initialCommentCount);

  const load = useCallback(async () => {
    if (!canShowComments) {
      setComments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getKnowledgeMaterialComments(materialId);
      setComments(data.comments);
      setCommentCount(data.comments.length);
      onCommentCountChange?.(data.comments.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить комментарии');
    } finally {
      setLoading(false);
    }
  }, [canShowComments, materialId, onCommentCountChange]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash !== `#${KNOWLEDGE_MATERIAL_COMMENTS_SECTION_ID}`) return;
    const section = document.getElementById(KNOWLEDGE_MATERIAL_COMMENTS_SECTION_ID);
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [loading]);

  const handleSubmit = async () => {
    const text = draft.trim();
    if (!text || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const result = await createKnowledgeMaterialComment(materialId, text);
      setComments((prev) => [...prev, result.comment]);
      setCommentCount(result.commentCount);
      onCommentCountChange?.(result.commentCount);
      setDraft('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отправить комментарий');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canShowComments) {
    return null;
  }

  return (
    <section className={styles.section} id={KNOWLEDGE_MATERIAL_COMMENTS_SECTION_ID}>
      <div className={styles.header}>
        <CommentIcon size={18} active={commentCount > 0} />
        <h2 className={styles.title}>Комментарии</h2>
        {commentCount > 0 ? <span className={styles.count}>{commentCount}</span> : null}
      </div>

      {loading ? <p className={styles.hint}>Загрузка комментариев…</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {!loading && comments.length === 0 ? (
        <p className={styles.hint}>Пока нет комментариев. Будьте первым, кто поделится мыслями.</p>
      ) : null}

      {comments.length > 0 ? (
        <ul className={styles.list}>
          {comments.map((comment) => {
            const displayName = formatKnowledgeLikerLabel(comment.author);
            const avatarUrl = getAvatarUrl(comment.author.avatar);

            return (
              <li key={comment.id} className={styles.item}>
                <div className={styles.itemHeader}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className={styles.avatar} />
                  ) : (
                    <span className={styles.avatarFallback} aria-hidden>
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className={styles.itemMeta}>
                    <span className={styles.author}>{displayName}</span>
                    <time className={styles.date} dateTime={comment.createdAt}>
                      {formatDate(comment.createdAt)}
                    </time>
                  </div>
                </div>
                <p className={styles.text}>{comment.text}</p>
              </li>
            );
          })}
        </ul>
      ) : null}

      {canWriteComments ? (
        <div className={styles.form} data-admin-participate>
          <label className={styles.label} htmlFor={`knowledge-comment-${materialId}`}>
            Ваш комментарий
          </label>
          <textarea
            id={`knowledge-comment-${materialId}`}
            className={styles.textarea}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Поделитесь впечатлениями или вопросами по материалу…"
            rows={3}
            maxLength={2000}
            disabled={submitting}
          />
          <div className={styles.formFooter}>
            <span className={styles.counter}>{draft.length} / 2000</span>
            <button
              type="button"
              className={styles.submitBtn}
              onClick={() => void handleSubmit()}
              disabled={submitting || !draft.trim()}
            >
              {submitting ? 'Отправка…' : 'Отправить'}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
