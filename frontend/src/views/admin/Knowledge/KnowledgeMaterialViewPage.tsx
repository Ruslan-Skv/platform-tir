'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import { useAuth } from '@/features/auth';
import {
  type AdminKnowledgeMaterial,
  getKnowledgeMaterial,
  publishKnowledgeMaterial,
} from '@/shared/api/admin-knowledge';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';

import { KnowledgeAttachmentsList } from './KnowledgeAttachmentsList';
import styles from './KnowledgeMaterialViewPage.module.css';
import { KnowledgeVideoPlayer } from './KnowledgeVideoPlayer';
import {
  formatAuthorName,
  formatDate,
  getMaterialTypeIcon,
  getMaterialTypeLabel,
  getStatusLabel,
  isKnowledgeEditor,
} from './knowledge-utils';

interface KnowledgeMaterialViewPageProps {
  materialId: string;
}

export function KnowledgeMaterialViewPage({ materialId }: KnowledgeMaterialViewPageProps) {
  const { user } = useAuth();
  const canEdit = isKnowledgeEditor(user?.role);

  const [material, setMaterial] = useState<AdminKnowledgeMaterial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getKnowledgeMaterial(materialId);
      setMaterial(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Материал не найден');
      setMaterial(null);
    } finally {
      setLoading(false);
    }
  }, [materialId]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePublish = async () => {
    if (!material) return;
    setPublishing(true);
    try {
      const updated = await publishKnowledgeMaterial(material.id);
      setMaterial(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка публикации');
    } finally {
      setPublishing(false);
    }
  };

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
          {canEdit && material.status !== 'PUBLISHED' && (
            <span className={styles.statusBadge}>{getStatusLabel(material.status)}</span>
          )}
        </div>
        <h1 className={styles.title}>{material.title}</h1>
        {material.excerpt && <p className={styles.excerpt}>{material.excerpt}</p>}
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={publicUploadUrl(material.thumbnailUrl)} alt="" className={styles.thumbnail} />
        </div>
      )}

      {material.type === 'ARTICLE' && material.content && (
        <article
          className={styles.article}
          dangerouslySetInnerHTML={{ __html: material.content }}
        />
      )}

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
