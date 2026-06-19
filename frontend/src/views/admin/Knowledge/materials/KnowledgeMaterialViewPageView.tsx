'use client';

import Link from 'next/link';

import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import {
  CommentIcon,
  InterestingMaterialIcon,
  ManagerPracticalAssignmentIcon,
} from '@/shared/ui/icons';

import { KnowledgeAttachmentsList } from '../shared/KnowledgeAttachmentsList';
import { KnowledgeMaterialComments } from '../shared/KnowledgeMaterialComments';
import { KnowledgeMaterialInterestingBadge } from '../shared/KnowledgeMaterialInterestingBadge';
import { KnowledgeMaterialQuiz } from '../shared/KnowledgeMaterialQuiz';
import { KnowledgeVideoPlayer } from '../shared/KnowledgeVideoPlayer';
import { KNOWLEDGE_MATERIAL_COMMENTS_SECTION_ID } from '../shared/knowledge-comments.constants';
import {
  formatAuthorName,
  formatDate,
  formatReadingTime,
  formatTargetAudiences,
  getKnowledgeThumbnailDisplayClass,
  getMaterialReadingTime,
  getMaterialTypeIcon,
  getMaterialTypeLabel,
  getStatusLabel,
  hasTargetAudiences,
} from '../shared/knowledge-utils';
import styles from './KnowledgeMaterialViewPage.module.css';
import type { KnowledgeMaterialViewPageModel } from './hooks/useKnowledgeMaterialViewPage';

type KnowledgeMaterialViewPageViewProps = {
  model: KnowledgeMaterialViewPageModel;
};

export function KnowledgeMaterialViewPageView({ model }: KnowledgeMaterialViewPageViewProps) {
  const {
    material,
    loading,
    error,
    canEdit,
    publishing,
    togglingLike,
    handlePublish,
    handleToggleLike,
    handleCommentCountChange,
    backUrl,
  } = model;

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Загрузка…</div>
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className={styles.page}>
        <Link href={backUrl} className={styles.backLink}>
          ← Назад
        </Link>
        <div className={styles.error}>{error || 'Материал не найден'}</div>
      </div>
    );
  }

  const targetAudiencesText = formatTargetAudiences(material.targetAudiences);
  const likeCount = material.likeCount ?? 0;
  const likedByMe = material.likedByMe ?? false;
  const commentCount = material.commentCount ?? 0;
  const canMarkInteresting = material.status === 'PUBLISHED';
  const canComment = material.status === 'PUBLISHED';

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link href={backUrl} className={styles.backLink}>
          ← Назад
        </Link>
        <div className={styles.topActions}>
          {canMarkInteresting ? (
            <button
              type="button"
              className={`${styles.likeBtn} ${likedByMe ? styles.likeBtnActive : ''}`}
              onClick={() => void handleToggleLike()}
              disabled={togglingLike}
              title={
                likedByMe
                  ? `Снять отметку «интересный»${likeCount > 0 ? ` (${likeCount})` : ''}`
                  : `Отметить как интересный${likeCount > 0 ? ` — уже отметили: ${likeCount}` : ''}`
              }
            >
              <InterestingMaterialIcon marked={likedByMe} size={16} />
              {likeCount > 0 ? <span>{likeCount}</span> : null}
              <span>{likedByMe ? 'Интересный' : 'Отметить интересным'}</span>
            </button>
          ) : null}
          {canComment ? (
            <a
              href={`#${KNOWLEDGE_MATERIAL_COMMENTS_SECTION_ID}`}
              className={styles.commentBtn}
              title={
                commentCount > 0
                  ? `Комментарии: ${commentCount}. Перейти к обсуждению`
                  : 'Оставить комментарий под материалом'
              }
            >
              <CommentIcon active={commentCount > 0} size={16} />
              {commentCount > 0 ? <span>{commentCount}</span> : null}
              <span>Комментарии</span>
            </a>
          ) : null}
          {canEdit ? (
            <>
              {material.status !== 'PUBLISHED' && (
                <button
                  type="button"
                  className={styles.publishBtn}
                  onClick={handlePublish}
                  disabled={publishing}
                >
                  {publishing ? 'Публикация…' : 'Опубликовать'}
                </button>
              )}
              <Link
                href={`/admin/knowledge/materials/${material.id}/edit`}
                className={styles.editBtn}
              >
                Редактировать
              </Link>
            </>
          ) : null}
        </div>
      </div>

      <header className={styles.header}>
        <div className={styles.badges}>
          {material.isPinned && <span className={styles.pinnedBadge}>📌 Закреплено</span>}
          {likeCount > 0 ? (
            <KnowledgeMaterialInterestingBadge
              materialId={material.id}
              likeCount={likeCount}
              className={styles.interestingBadge}
            >
              ★ Интересный · {likeCount}
            </KnowledgeMaterialInterestingBadge>
          ) : null}
          <span className={styles.typeBadge}>
            {getMaterialTypeIcon(material.type)} {getMaterialTypeLabel(material.type)}
          </span>
          <span className={styles.categoryBadge}>{material.category.name}</span>
          {material.module ? (
            <span className={styles.categoryBadge}>{material.module.name}</span>
          ) : null}
          {canEdit && material.status !== 'PUBLISHED' && (
            <span className={styles.statusBadge}>{getStatusLabel(material.status)}</span>
          )}
        </div>
        <h1 className={styles.title}>{material.title}</h1>
        {material.excerpt && <p className={styles.excerpt}>{material.excerpt}</p>}
        {material.type === 'ARTICLE' &&
        (hasTargetAudiences(material.targetAudiences) || getMaterialReadingTime(material)) ? (
          <div className={styles.articleMeta}>
            {targetAudiencesText ? (
              <span className={styles.articleMetaItem}>
                <span className={styles.articleMetaLabel}>Целевая аудитория:</span>{' '}
                {targetAudiencesText}
              </span>
            ) : null}
            {formatReadingTime(getMaterialReadingTime(material)) ? (
              <span className={styles.articleMetaItem}>
                <span className={styles.articleMetaLabel}>Время чтения:</span>{' '}
                {formatReadingTime(getMaterialReadingTime(material))}
              </span>
            ) : null}
          </div>
        ) : null}
        <div className={styles.meta}>
          <span>{formatAuthorName(material.author)}</span>
          <span>{formatDate(material.publishedAt || material.createdAt)}</span>
        </div>
      </header>

      {material.type === 'VIDEO' && material.videoUrl && (
        <section className={styles.videoSection}>
          <KnowledgeVideoPlayer
            materialId={material.id}
            url={material.videoUrl}
            title={material.title}
            initialProgress={material.myVideoProgress}
          />
        </section>
      )}

      {material.thumbnailUrl && material.type !== 'VIDEO' && (
        <div className={styles.thumbnailWrap}>
          <img
            src={publicUploadUrl(material.thumbnailUrl)}
            alt=""
            className={`${styles.thumbnail} ${getKnowledgeThumbnailDisplayClass(material.thumbnailDisplay, styles)}`}
          />
        </div>
      )}

      {material.type === 'ARTICLE' && material.content && (
        <article
          className={styles.article}
          dangerouslySetInnerHTML={{ __html: material.content }}
        />
      )}

      {material.type === 'ARTICLE' && material.managerPracticalAssignment ? (
        <aside className={styles.managerBox}>
          <div className={styles.managerIcon}>
            <ManagerPracticalAssignmentIcon size={40} />
          </div>
          <h2 className={styles.managerTitle}>Практическое задание для менеджера</h2>
          <p className={styles.managerText}>{material.managerPracticalAssignment}</p>
        </aside>
      ) : null}

      {canEdit && material.type === 'ARTICLE' && material.tutorRecommendation ? (
        <aside className={styles.tutorBox}>
          <h2 className={styles.tutorTitle}>Рекомендация для тьютора</h2>
          <p className={styles.tutorText}>{material.tutorRecommendation}</p>
          <p className={styles.tutorNote}>Видно только редакторам и тьюторам</p>
        </aside>
      ) : null}

      {material.type === 'ARTICLE' ? (
        <KnowledgeMaterialQuiz
          materialId={material.id}
          materialStatus={material.status}
          canEdit={canEdit}
        />
      ) : null}

      {material.type === 'LINK' && material.externalUrl && (
        <section className={styles.linkSection}>
          <p className={styles.linkHint}>Внешний ресурс:</p>
          <a
            href={material.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.externalLink}
          >
            {material.externalUrl}
          </a>
          <button
            type="button"
            className={styles.openLinkBtn}
            onClick={() => window.open(material.externalUrl!, '_blank', 'noopener,noreferrer')}
          >
            Открыть ссылку ↗
          </button>
        </section>
      )}

      {material.type === 'VIDEO' && material.content && (
        <article className={styles.description}>
          <h2 className={styles.sectionTitle}>Описание</h2>
          <div className={styles.article} dangerouslySetInnerHTML={{ __html: material.content }} />
        </article>
      )}

      {material.attachments && material.attachments.length > 0 && (
        <KnowledgeAttachmentsList attachments={material.attachments} />
      )}

      <KnowledgeMaterialComments
        materialId={material.id}
        materialStatus={material.status}
        initialCommentCount={commentCount}
        onCommentCountChange={handleCommentCountChange}
      />
    </div>
  );
}
