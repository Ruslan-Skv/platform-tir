'use client';

import Link from 'next/link';

import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import { VideoPlayer } from '@/shared/ui/VideoPlayer';
import { BlogPostEditor } from '@/views/admin/Content/Blog';

import { KnowledgeAttachmentsEditor } from '../../shared/KnowledgeAttachmentsEditor';
import { getMaterialTypeLabel } from '../../shared/knowledge-utils';
import styles from './KnowledgeMaterialFormPage.module.css';
import type { KnowledgeMaterialFormPageModel } from './hooks/useKnowledgeMaterialFormPage';
import { KNOWLEDGE_MATERIAL_TYPES } from './knowledge-material-form-page.constants';

type KnowledgeMaterialFormPageViewProps = {
  model: KnowledgeMaterialFormPageModel;
};

export function KnowledgeMaterialFormPageView({ model }: KnowledgeMaterialFormPageViewProps) {
  const {
    isEdit,
    loading,
    saving,
    uploadingThumbnail,
    message,
    categories,
    type,
    setType,
    title,
    slug,
    setSlug,
    setSlugManual,
    categoryId,
    setCategoryId,
    excerpt,
    setExcerpt,
    content,
    setContent,
    videoUrl,
    setVideoUrl,
    externalUrl,
    setExternalUrl,
    thumbnailUrl,
    setThumbnailUrl,
    sortOrder,
    setSortOrder,
    isPinned,
    setIsPinned,
    attachments,
    setAttachments,
    status,
    setStatus,
    thumbnailInputRef,
    handleTitleChange,
    handleThumbnailUpload,
    handleSubmit,
  } = model;

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

      {message ? (
        <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>
      ) : null}

      {categories.length === 0 ? (
        <div className={`${styles.message} ${styles.error}`}>
          Сначала создайте категорию на{' '}
          <Link href="/admin/knowledge" className={styles.backLink}>
            главной странице раздела
          </Link>
          .
        </div>
      ) : null}

      <div className={styles.typeTabs}>
        {KNOWLEDGE_MATERIAL_TYPES.map((t) => (
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
              {categories.length === 0 ? <option value="">Нет категорий</option> : null}
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

        {type === 'VIDEO' ? (
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
            {videoUrl.trim() ? (
              <div className={styles.preview}>
                <p className={styles.previewLabel}>Предпросмотр</p>
                <VideoPlayer url={videoUrl} title={title || 'Видео'} />
              </div>
            ) : null}
            <div className={styles.field}>
              <label className={styles.label}>Описание к видео</label>
              <BlogPostEditor
                value={content}
                onChange={setContent}
                placeholder="Дополнительные пояснения, таймкоды, ссылки…"
              />
            </div>
          </>
        ) : null}

        {type === 'ARTICLE' ? (
          <div className={styles.field}>
            <label className={styles.label}>Текст статьи *</label>
            <BlogPostEditor
              value={content}
              onChange={setContent}
              placeholder="Инструкция, регламент, пошаговое руководство…"
            />
          </div>
        ) : null}

        {type === 'LINK' ? (
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
        ) : null}

        {type === 'ARTICLE' || type === 'VIDEO' ? (
          <div className={styles.field}>
            <label className={styles.label}>Вложения</label>
            <KnowledgeAttachmentsEditor attachments={attachments} onChange={setAttachments} />
          </div>
        ) : null}

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
            {thumbnailUrl ? (
              <button type="button" className={styles.clearBtn} onClick={() => setThumbnailUrl('')}>
                Удалить
              </button>
            ) : null}
          </div>
          {thumbnailUrl ? (
            <div className={styles.thumbnailPreview}>
              {}
              <img src={publicUploadUrl(thumbnailUrl)} alt="" />
            </div>
          ) : null}
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
            onClick={() => void handleSubmit(false)}
            disabled={saving}
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
          <button
            type="button"
            className={styles.publishBtn}
            onClick={() => void handleSubmit(true)}
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
