'use client';

import Link from 'next/link';

import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import { getSafeHref } from '@/shared/lib/sanitize';
import {
  CommentIcon,
  InterestingMaterialIcon,
  KnowledgeFavoriteIcon,
  ManagerPracticalAssignmentIcon,
} from '@/shared/ui/icons';

import { KnowledgeTrainingCelebrationModal } from '../shared/celebration/KnowledgeTrainingCelebrationModal';
import {
  formatAuthorName,
  formatDate,
  formatReadingTime,
  formatTargetAudiences,
  formatVideoDuration,
  getKnowledgeThumbnailDisplayClass,
  getMaterialReadingTime,
  getMaterialTypeIcon,
  getMaterialTypeLabel,
  getMaterialVideoDuration,
  getStatusLabel,
  hasTargetAudiences,
  isKnowledgeRichTextEmpty,
  renderKnowledgeRichTextHtml,
  resolveKnowledgeArticleHtml,
} from '../shared/knowledge-utils';
import { KnowledgeAttachmentsList } from '../shared/material/KnowledgeAttachmentsList';
import { KnowledgeMaterialComments } from '../shared/material/KnowledgeMaterialComments';
import { KnowledgeMaterialInterestingBadge } from '../shared/material/KnowledgeMaterialInterestingBadge';
import { KnowledgeVideoPlayer } from '../shared/material/KnowledgeVideoPlayer';
import { KNOWLEDGE_MATERIAL_COMMENTS_SECTION_ID } from '../shared/material/knowledge-comments.constants';
import { KnowledgeMaterialQuiz } from '../shared/quiz/KnowledgeMaterialQuiz';
import { KnowledgeBackLink } from '../shared/ui/KnowledgeBackLink';
import { buildKnowledgeMaterialViewUrl } from '../territory/knowledge-territory-filters-storage';
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
    canParticipate,
    canStudy,
    publishing,
    togglingLike,
    togglingFavorite,
    handlePublish,
    handleToggleLike,
    handleToggleFavorite,
    handleCommentCountChange,
    handleStudyProgressWithCelebration,
    celebration,
    dismissCelebration,
    backUrl,
    nextMaterial,
    listContext,
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
        <KnowledgeBackLink href={backUrl}>← Назад</KnowledgeBackLink>
        <div className={styles.error}>{error || 'Материал не найден'}</div>
      </div>
    );
  }

  const targetAudiencesText = formatTargetAudiences(material.targetAudiences);
  const likeCount = material.likeCount ?? 0;
  const likedByMe = material.likedByMe ?? false;
  const favoritedByMe = material.favoritedByMe ?? false;
  const commentCount = material.commentCount ?? 0;
  const canMarkInteresting = material.status === 'PUBLISHED';
  const canComment = material.status === 'PUBLISHED';
  const isLocked = canStudy && Boolean(material.sequentialLocked);
  const studyCompleted = Boolean(material.studyCompleted);
  const canToggleFavorite = canParticipate && (!canStudy || !isLocked || favoritedByMe);
  const canToggleInteresting =
    canParticipate && canMarkInteresting && (!canStudy || studyCompleted || likedByMe);
  const showNextMaterial = canStudy && material.studyCompleted && nextMaterial;
  const celebrationNextMaterialId = celebration?.nextMaterialId ?? null;
  const celebrationNextMaterialHref = celebrationNextMaterialId
    ? buildKnowledgeMaterialViewUrl(celebrationNextMaterialId, {
        categoryFilter: listContext.categoryFilter || material.categoryId,
        favoritesOnly: listContext.favoritesOnly,
      })
    : null;
  const celebrationNextMaterialTitle =
    celebrationNextMaterialId && nextMaterial?.id === celebrationNextMaterialId
      ? nextMaterial.title
      : null;

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <KnowledgeBackLink href={backUrl}>← Назад</KnowledgeBackLink>
        <div className={styles.topActions}>
          {canParticipate ? (
            <button
              type="button"
              className={`${styles.likeBtn} ${favoritedByMe ? styles.favoriteBtnActive : ''}`}
              onClick={() => void handleToggleFavorite()}
              disabled={togglingFavorite || !canToggleFavorite}
              title={
                !canToggleFavorite
                  ? 'Добавить в избранное можно после разблокировки материала'
                  : favoritedByMe
                    ? 'Убрать из избранного'
                    : 'Добавить в избранное'
              }
            >
              <KnowledgeFavoriteIcon favorited={favoritedByMe} size={16} />
              <span className={styles.actionTextFull}>
                {favoritedByMe ? 'В избранном' : 'В избранное'}
              </span>
            </button>
          ) : null}
          {canMarkInteresting && canParticipate ? (
            <button
              type="button"
              className={`${styles.likeBtn} ${likedByMe ? styles.likeBtnActive : ''}`}
              onClick={() => void handleToggleLike()}
              disabled={togglingLike || !canToggleInteresting}
              title={
                !canToggleInteresting
                  ? 'Отметить как интересный можно после изучения материала'
                  : likedByMe
                    ? `Снять отметку «интересный»${likeCount > 0 ? ` (${likeCount})` : ''}`
                    : `Отметить как интересный${likeCount > 0 ? ` — уже отметили: ${likeCount}` : ''}`
              }
            >
              <InterestingMaterialIcon marked={likedByMe} size={16} />
              {likeCount > 0 ? <span>{likeCount}</span> : null}
              <span className={styles.actionTextFull}>
                {likedByMe ? 'Интересный' : 'Отметить интересным'}
              </span>
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
              <span className={styles.actionTextFull}>Комментарии</span>
              <span className={styles.actionTextShort}>Комм.</span>
            </a>
          ) : null}
          {canEdit ? (
            <>
              {material.status !== 'PUBLISHED' && (
                <button
                  data-admin-mutation
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
          {material.isPinned && canEdit ? (
            <span className={styles.pinnedBadge}>📌 Закреплено редактором</span>
          ) : null}
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
        {material.type === 'VIDEO' &&
        (hasTargetAudiences(material.targetAudiences) || getMaterialVideoDuration(material)) ? (
          <div className={styles.articleMeta}>
            {targetAudiencesText ? (
              <span className={styles.articleMetaItem}>
                <span className={styles.articleMetaLabel}>Целевая аудитория:</span>{' '}
                {targetAudiencesText}
              </span>
            ) : null}
            {formatVideoDuration(getMaterialVideoDuration(material)) ? (
              <span className={styles.articleMetaItem}>
                <span className={styles.articleMetaLabel}>Длительность:</span>{' '}
                {formatVideoDuration(getMaterialVideoDuration(material))}
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
            canTrackProgress={canStudy}
            onCompleted={handleStudyProgressWithCelebration}
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
          dangerouslySetInnerHTML={{ __html: resolveKnowledgeArticleHtml(material.content) }}
        />
      )}

      {material.type === 'ARTICLE' &&
      material.managerPracticalAssignment &&
      !isKnowledgeRichTextEmpty(material.managerPracticalAssignment) ? (
        <aside className={styles.managerBox}>
          <div className={styles.managerIcon}>
            <ManagerPracticalAssignmentIcon size={40} />
          </div>
          <h2 className={styles.managerTitle}>Практическое задание для менеджера</h2>
          <div
            className={styles.managerText}
            dangerouslySetInnerHTML={{
              __html: renderKnowledgeRichTextHtml(material.managerPracticalAssignment),
            }}
          />
          {canStudy ? (
            <p className={styles.managerLearnerNote}>
              На встрече с вашим тьютором вам необходимо будет рассказать о результатах выполнения
              практического задания
            </p>
          ) : null}
        </aside>
      ) : null}

      {canEdit && material.type === 'ARTICLE' && material.tutorRecommendation ? (
        <aside className={styles.tutorBox}>
          <h2 className={styles.tutorTitle}>Рекомендация для тьютора</h2>
          <p className={styles.tutorText}>{material.tutorRecommendation}</p>
          <p className={styles.tutorNote}>Видно только редакторам и тьюторам</p>
        </aside>
      ) : null}

      {material.type === 'ARTICLE' && material.myQuizStatus?.hasQuiz ? (
        <KnowledgeMaterialQuiz
          materialId={material.id}
          materialStatus={material.status}
          canEdit={canEdit}
          canStudy={canStudy}
          onQuizPassed={handleStudyProgressWithCelebration}
        />
      ) : null}

      {material.type === 'LINK' && material.externalUrl && (
        <section className={styles.linkSection}>
          <p className={styles.linkHint}>Внешний ресурс:</p>
          <a
            href={getSafeHref(material.externalUrl, '#')}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.externalLink}
          >
            {material.externalUrl}
          </a>
          <button
            type="button"
            className={styles.openLinkBtn}
            onClick={() => {
              const safe = getSafeHref(material.externalUrl!, '#');
              if (safe !== '#') window.open(safe, '_blank', 'noopener,noreferrer');
            }}
          >
            Открыть ссылку ↗
          </button>
        </section>
      )}

      {material.type === 'VIDEO' && material.content && (
        <article className={styles.description}>
          <h2 className={styles.sectionTitle}>Описание</h2>
          <div
            className={styles.article}
            dangerouslySetInnerHTML={{ __html: resolveKnowledgeArticleHtml(material.content) }}
          />
        </article>
      )}

      {material.attachments && material.attachments.length > 0 && (
        <KnowledgeAttachmentsList attachments={material.attachments} />
      )}

      <footer className={styles.materialFooter}>
        <KnowledgeBackLink href={backUrl}>← Назад</KnowledgeBackLink>
        {showNextMaterial ? (
          <KnowledgeBackLink
            href={buildKnowledgeMaterialViewUrl(nextMaterial.id, {
              categoryFilter: listContext.categoryFilter || material.categoryId,
              favoritesOnly: listContext.favoritesOnly,
            })}
            className={styles.footerNextLink}
            title={nextMaterial.title}
          >
            Следующий материал →
          </KnowledgeBackLink>
        ) : null}
      </footer>

      <KnowledgeMaterialComments
        materialId={material.id}
        materialStatus={material.status}
        canParticipate={canParticipate}
        initialCommentCount={commentCount}
        onCommentCountChange={handleCommentCountChange}
      />

      <KnowledgeTrainingCelebrationModal
        celebration={celebration}
        onClose={dismissCelebration}
        nextMaterialHref={celebrationNextMaterialHref}
        nextMaterialTitle={celebrationNextMaterialTitle}
        backHref={backUrl}
      />
    </div>
  );
}
