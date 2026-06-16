'use client';

import Link from 'next/link';

import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import { VideoPlayer } from '@/shared/ui/VideoPlayer';
import { BlogPostEditor } from '@/views/admin/Content/Blog';

import { KnowledgeAttachmentsEditor } from '../../shared/KnowledgeAttachmentsEditor';
import { KnowledgeQuizEditor } from '../../shared/KnowledgeQuizEditor';
import { getMaterialTypeLabel } from '../../shared/knowledge-utils';
import styles from './KnowledgeMaterialFormPage.module.css';
import { KnowledgeTargetAudienceField } from './KnowledgeTargetAudienceField';
import type { KnowledgeMaterialFormPageModel } from './hooks/useKnowledgeMaterialFormPage';
import { KNOWLEDGE_MATERIAL_TYPES } from './knowledge-material-form-page.constants';

type KnowledgeMaterialFormPageViewProps = {
  model: KnowledgeMaterialFormPageModel;
};

export function KnowledgeMaterialFormPageView({ model }: KnowledgeMaterialFormPageViewProps) {
  const {
    materialId,
    isEdit,
    loading,
    saving,
    uploadingThumbnail,
    message,
    categories,
    modules,
    type,
    setType,
    title,
    slug,
    setSlug,
    setSlugManual,
    categoryId,
    setCategoryId,
    moduleId,
    setModuleId,
    excerpt,
    setExcerpt,
    targetAudienceOptions,
    setTargetAudienceOptions,
    targetAudienceIds,
    setTargetAudienceIds,
    readingTimeMinutes,
    setReadingTimeMinutes,
    tutorRecommendation,
    setTutorRecommendation,
    estimatedReadingTime,
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
      <div className={styles.pageHeader}>
        <Link href="/admin/knowledge" className={styles.backLink}>
          ← Территория знаний
        </Link>
        <h1 className={styles.title}>{isEdit ? 'Редактирование материала' : 'Новый материал'}</h1>
      </div>

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
        <section className={styles.metaSection}>
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

          <div className={`${styles.row} ${type === 'ARTICLE' ? styles.rowThree : ''}`}>
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
            {type === 'ARTICLE' ? (
              <div className={styles.field}>
                <label htmlFor="readingTimeMinutes" className={styles.label}>
                  Время чтения (мин)
                </label>
                <input
                  id="readingTimeMinutes"
                  type="number"
                  min={1}
                  value={readingTimeMinutes}
                  onChange={(e) =>
                    setReadingTimeMinutes(
                      e.target.value === '' ? '' : parseInt(e.target.value, 10) || ''
                    )
                  }
                  className={styles.input}
                  placeholder="Авто"
                  title={
                    estimatedReadingTime
                      ? `Автоподсчёт: ~${estimatedReadingTime} мин`
                      : 'Заполнится после добавления текста'
                  }
                />
              </div>
            ) : null}
          </div>

          <div className={`${styles.row} ${styles.rowModuleExcerpt}`}>
            <div className={styles.field}>
              <label
                htmlFor="module"
                className={styles.label}
                title="Создать модуль — на главной раздела"
              >
                Модуль
              </label>
              <select
                id="module"
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                className={styles.select}
                disabled={!categoryId || modules.length === 0}
              >
                <option value="">
                  {!categoryId
                    ? 'Сначала категория'
                    : modules.length === 0
                      ? 'Нет модулей'
                      : 'Без модуля'}
                </option>
                {modules.map((mod) => (
                  <option key={mod.id} value={mod.id}>
                    {mod.name}
                  </option>
                ))}
              </select>
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
                rows={1}
                placeholder="Для карточки в списке"
              />
            </div>
          </div>

          {type === 'ARTICLE' ? (
            <div className={styles.field}>
              <label htmlFor="targetAudiencePick" className={styles.label}>
                Целевая аудитория
              </label>
              <KnowledgeTargetAudienceField
                options={targetAudienceOptions}
                selectedIds={targetAudienceIds}
                onSelectedIdsChange={setTargetAudienceIds}
                onOptionsChange={setTargetAudienceOptions}
                disabled={saving}
              />
            </div>
          ) : null}

          {type === 'ARTICLE' ? (
            <div className={styles.field}>
              <label
                htmlFor="tutorRecommendation"
                className={styles.label}
                title="Видно только редакторам и тьюторам"
              >
                Рекомендация для тьютора
              </label>
              <textarea
                id="tutorRecommendation"
                value={tutorRecommendation}
                onChange={(e) => setTutorRecommendation(e.target.value)}
                className={styles.textarea}
                rows={2}
                placeholder="Сценарий разбора на тренинге (не видно менеджерам)"
              />
            </div>
          ) : null}
        </section>

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
              enableTables
              placeholder="Инструкция, регламент, пошаговое руководство… Для таблиц используйте кнопку ⊞ на панели."
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

        {isEdit && type === 'ARTICLE' && materialId ? (
          <KnowledgeQuizEditor materialId={materialId} />
        ) : null}

        <section className={styles.settingsSection}>
          <div className={styles.settingsRow}>
            <div className={styles.field}>
              <label className={styles.label}>Обложка</label>
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
                  {uploadingThumbnail ? '…' : 'Загрузить'}
                </button>
                {thumbnailUrl ? (
                  <button
                    type="button"
                    className={styles.clearBtn}
                    onClick={() => setThumbnailUrl('')}
                  >
                    Удалить
                  </button>
                ) : null}
                {thumbnailUrl ? (
                  <div className={styles.thumbnailPreviewInline}>
                    <img src={publicUploadUrl(thumbnailUrl)} alt="" />
                  </div>
                ) : null}
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="sortOrder" className={styles.label}>
                Порядок
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
            <div className={`${styles.field} ${styles.fieldCheckbox}`}>
              <span className={styles.label}>Закрепление</span>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                />
                Вверху списка
              </label>
            </div>
          </div>
        </section>

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
