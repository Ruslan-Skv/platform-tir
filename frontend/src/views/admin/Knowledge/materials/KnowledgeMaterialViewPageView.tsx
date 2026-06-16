'use client';

import Link from 'next/link';

import { publicUploadUrl } from '@/shared/lib/public-upload-url';

import { KnowledgeAttachmentsList } from '../shared/KnowledgeAttachmentsList';
import { KnowledgeMaterialQuiz } from '../shared/KnowledgeMaterialQuiz';
import { KnowledgeVideoPlayer } from '../shared/KnowledgeVideoPlayer';
import {
  formatAuthorName,
  formatDate,
  formatReadingTime,
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
  const { material, loading, error, canEdit, publishing, handlePublish } = model;

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
        <Link href="/admin/knowledge" className={styles.backLink}>
          ← К разделу «Территория знаний»
        </Link>
        <div className={styles.error}>{error || 'Материал не найден'}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/admin/knowledge" className={styles.backLink}>
          ← К разделу «Территория знаний»
        </Link>
        {canEdit && (
          <div className={styles.topActions}>
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
          </div>
        )}
      </div>

      <header className={styles.header}>
        <div className={styles.badges}>
          {material.isPinned && <span className={styles.pinnedBadge}>📌 Закреплено</span>}
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
            {material.targetAudiences?.map((audience) => (
              <span key={audience.id} className={styles.articleMetaItem}>
                <span className={styles.articleMetaLabel}>Целевая аудитория:</span> {audience.label}
              </span>
            ))}
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
          {}
          <img src={publicUploadUrl(material.thumbnailUrl)} alt="" className={styles.thumbnail} />
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
    </div>
  );
}
