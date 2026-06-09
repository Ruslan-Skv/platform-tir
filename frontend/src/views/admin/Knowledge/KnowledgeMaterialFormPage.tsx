'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  type AdminKnowledgeCategory,
  type KnowledgeAttachmentInput,
  type KnowledgeMaterialType,
  createKnowledgeMaterial,
  getKnowledgeCategories,
  getKnowledgeMaterial,
  updateKnowledgeMaterial,
  uploadKnowledgeThumbnail,
} from '@/shared/api/admin-knowledge';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import { VideoPlayer } from '@/shared/ui/VideoPlayer';
import { BlogPostEditor } from '@/views/admin/Content/BlogPostEditor';

import { KnowledgeAttachmentsEditor } from './KnowledgeAttachmentsEditor';
import styles from './KnowledgeMaterialFormPage.module.css';
import { getMaterialTypeLabel, slugify } from './knowledge-utils';

interface KnowledgeMaterialFormPageProps {
  materialId?: string;
}

const MATERIAL_TYPES: KnowledgeMaterialType[] = ['VIDEO', 'ARTICLE', 'LINK'];

export function KnowledgeMaterialFormPage({ materialId }: KnowledgeMaterialFormPageProps) {
  const router = useRouter();
  const isEdit = !!materialId;
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [categories, setCategories] = useState<AdminKnowledgeCategory[]>([]);

  const [type, setType] = useState<KnowledgeMaterialType>('VIDEO');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isPinned, setIsPinned] = useState(false);
  const [attachments, setAttachments] = useState<KnowledgeAttachmentInput[]>([]);
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT');

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const loadCategories = useCallback(async () => {
    try {
      const data = await getKnowledgeCategories();
      setCategories(data);
      if (!categoryId && data.length > 0) {
        setCategoryId(data[0].id);
      }
    } catch {
      showMessage('error', 'Ошибка загрузки категорий');
    }
  }, [categoryId]);

  const loadMaterial = useCallback(async () => {
    if (!materialId) return;
    setLoading(true);
    try {
      const m = await getKnowledgeMaterial(materialId);
      setType(m.type);
      setTitle(m.title);
      setSlug(m.slug);
      setSlugManual(true);
      setCategoryId(m.categoryId);
      setExcerpt(m.excerpt || '');
      setContent(m.content || '');
      setVideoUrl(m.videoUrl || '');
      setExternalUrl(m.externalUrl || '');
      setThumbnailUrl(m.thumbnailUrl || '');
      setSortOrder(m.sortOrder);
      setIsPinned(m.isPinned);
      setAttachments(
        (m.attachments ?? []).map((a) => ({
          fileName: a.fileName,
          fileUrl: a.fileUrl,
          fileSize: a.fileSize ?? undefined,
          mimeType: a.mimeType ?? undefined,
          sortOrder: a.sortOrder,
        }))
      );
      setStatus(m.status);
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Материал не найден');
    } finally {
      setLoading(false);
    }
  }, [materialId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (isEdit) loadMaterial();
  }, [isEdit, loadMaterial]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugManual) {
      setSlug(slugify(value));
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingThumbnail(true);
    try {
      const { imageUrl } = await uploadKnowledgeThumbnail(file);
      setThumbnailUrl(imageUrl);
      showMessage('success', 'Обложка загружена');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploadingThumbnail(false);
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
    }
  };

  const handleSubmit = async (publishNow = false) => {
    if (!title.trim() || !slug.trim() || !categoryId) {
      showMessage('error', 'Заполните название, slug и категорию');
      return;
    }
    if (type === 'VIDEO' && !videoUrl.trim()) {
      showMessage('error', 'Укажите ссылку на видео');
      return;
    }
    if (type === 'ARTICLE' && !content.trim()) {
      showMessage('error', 'Добавьте текст статьи');
      return;
    }
    if (type === 'LINK' && !externalUrl.trim()) {
      showMessage('error', 'Укажите внешнюю ссылку');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        categoryId,
        type,
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim() || undefined,
        content: content.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        externalUrl: externalUrl.trim() || undefined,
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        sortOrder,
        isPinned,
        attachments,
        status: publishNow ? ('PUBLISHED' as const) : status,
      };

      if (isEdit && materialId) {
        await updateKnowledgeMaterial(materialId, payload);
        showMessage('success', 'Материал сохранён');
        router.push(`/admin/knowledge/materials/${materialId}`);
      } else {
        const created = await createKnowledgeMaterial(payload);
        showMessage('success', 'Материал создан');
        router.push(`/admin/knowledge/materials/${created.id}`);
      }
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Загрузка…</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link href="/admin/knowledge" className={styles.backLink}>
        ← К разделу «Территория знаний»
      </Link>

      <h1 className={styles.title}>{isEdit ? 'Редактирование материала' : 'Новый материал'}</h1>

      {message && <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>}

      {categories.length === 0 && (
        <div className={`${styles.message} ${styles.error}`}>
          Сначала создайте категорию на{' '}
          <Link href="/admin/knowledge" className={styles.backLink}>
            главной странице раздела
          </Link>
          .
        </div>
      )}

      <div className={styles.typeTabs}>
        {MATERIAL_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className={`${styles.typeTab} ${type === t ? styles.typeTabActive : ''}`}
            onClick={() => setType(t)}
            disabled={isEdit}
            title={isEdit ? 'Тип нельзя изменить после создания' : undefined}
          >
            {getMaterialTypeLabel(t)}
          </button>
        ))}
      </div>

      <div className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="title" className={styles.label}>
            Название *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className={styles.input}
            placeholder="Например: Работа с CRM — основы"
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="slug" className={styles.label}>
              Slug *
            </label>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugManual(true);
              }}
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="category" className={styles.label}>
              Категория *
            </label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={styles.select}
            >
              {categories.length === 0 && <option value="">Нет категорий</option>}
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="excerpt" className={styles.label}>
            Краткое описание
          </label>
          <textarea
            id="excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            className={styles.textarea}
            rows={2}
            placeholder="Коротко о чём материал — отображается в карточке"
          />
        </div>

        {type === 'VIDEO' && (
          <>
            <div className={styles.field}>
              <label htmlFor="videoUrl" className={styles.label}>
                Ссылка на видео *
              </label>
              <input
                id="videoUrl"
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className={styles.input}
                placeholder="https://www.youtube.com/watch?v=... или Vimeo, или прямой URL"
              />
              <p className={styles.hint}>
                Поддерживаются YouTube, Vimeo и прямые ссылки на видеофайлы
              </p>
            </div>
            {videoUrl.trim() && (
              <div className={styles.preview}>
                <p className={styles.previewLabel}>Предпросмотр</p>
                <VideoPlayer url={videoUrl} title={title || 'Видео'} />
              </div>
            )}
            <div className={styles.field}>
              <label className={styles.label}>Описание к видео</label>
              <BlogPostEditor
                value={content}
                onChange={setContent}
                placeholder="Дополнительные пояснения, таймкоды, ссылки…"
              />
            </div>
          </>
        )}

        {type === 'ARTICLE' && (
          <div className={styles.field}>
            <label className={styles.label}>Текст статьи *</label>
            <BlogPostEditor
              value={content}
              onChange={setContent}
              placeholder="Инструкция, регламент, пошаговое руководство…"
            />
          </div>
        )}

        {type === 'LINK' && (
          <div className={styles.field}>
            <label htmlFor="externalUrl" className={styles.label}>
              Внешняя ссылка *
            </label>
            <input
              id="externalUrl"
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              className={styles.input}
              placeholder="https://..."
            />
          </div>
        )}

        {(type === 'ARTICLE' || type === 'VIDEO') && (
          <div className={styles.field}>
            <label className={styles.label}>Вложения</label>
            <KnowledgeAttachmentsEditor attachments={attachments} onChange={setAttachments} />
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label}>Обложка (превью)</label>
          <div className={styles.thumbnailRow}>
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleThumbnailUpload}
              className={styles.hiddenInput}
            />
            <button
              type="button"
              className={styles.uploadBtn}
              onClick={() => thumbnailInputRef.current?.click()}
              disabled={uploadingThumbnail}
            >
              {uploadingThumbnail ? 'Загрузка…' : 'Загрузить изображение'}
            </button>
            {thumbnailUrl && (
              <button type="button" className={styles.clearBtn} onClick={() => setThumbnailUrl('')}>
                Удалить
              </button>
            )}
          </div>
          {thumbnailUrl && (
            <div className={styles.thumbnailPreview}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={publicUploadUrl(thumbnailUrl)} alt="" />
            </div>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
            />
            Закрепить вверху списка (важный материал)
          </label>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="sortOrder" className={styles.label}>
              Порядок сортировки
            </label>
            <input
              id="sortOrder"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="status" className={styles.label}>
              Статус
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className={styles.select}
            >
              <option value="DRAFT">Черновик</option>
              <option value="PUBLISHED">Опубликован</option>
              <option value="ARCHIVED">Архив</option>
            </select>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={() => handleSubmit(false)}
            disabled={saving}
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
          <button
            type="button"
            className={styles.publishBtn}
            onClick={() => handleSubmit(true)}
            disabled={saving}
          >
            {saving ? 'Сохранение…' : 'Сохранить и опубликовать'}
          </button>
          <Link href="/admin/knowledge" className={styles.cancelLink}>
            Отмена
          </Link>
        </div>
      </div>
    </div>
  );
}
