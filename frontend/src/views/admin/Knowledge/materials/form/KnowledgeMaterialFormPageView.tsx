'use client';

import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import { VideoProgressFill } from '@/shared/ui/VideoProgressFill/VideoProgressFill';
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import { BlogPostEditor } from '@/views/admin/Content/Blog';
import {
  AdminStickyPageRoot,
  AdminStickySaveButtonSlot,
} from '@/views/admin/ui/AdminStickySaveButton';

import {
  KNOWLEDGE_THUMBNAIL_DISPLAY_OPTIONS,
  getMaterialTypeLabel,
} from '../../shared/knowledge-utils';
import { KnowledgeAttachmentsEditor } from '../../shared/material/KnowledgeAttachmentsEditor';
import { KnowledgeVideoPlayer } from '../../shared/material/KnowledgeVideoPlayer';
import { KnowledgeQuizEditor } from '../../shared/quiz/KnowledgeQuizEditor';
import { KnowledgeBackLink } from '../../shared/ui/KnowledgeBackLink';
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
    uploadingVideo,
    videoUploadPercent,
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
    managerPracticalAssignment,
    setManagerPracticalAssignment,
    estimatedReadingTime,
    content,
    setContent,
    videoUrl,
    setVideoUrl,
    externalUrl,
    setExternalUrl,
    thumbnailUrl,
    thumbnailDisplay,
    setThumbnailDisplay,
    sortOrder,
    setSortOrder,
    isPinned,
    setIsPinned,
    attachments,
    setAttachments,
    status,
    setStatus,
    thumbnailInputRef,
    videoInputRef,
    quizEditorRef,
    pageHeaderRef,
    saveButtonState,
    saveButtonPinnedTopPx,
    secondaryButtonLabel,
    isSecondaryUnpublish,
    isPublishDisabled,
    handleHeaderSaveClick,
    handlePublishClick,
    handleUnpublishClick,
    handleTitleChange,
    handleThumbnailUpload,
    handleRemoveThumbnail,
    handleVideoUpload,
    handleContentImageUpload,
    handleContentImageUploadError,
  } = model;

  if (loading) {
    return (
      <AdminStickyPageRoot stickyTopPx={saveButtonPinnedTopPx} className={styles.page}>
        <div className={styles.loading}>Загрузка…</div>
      </AdminStickyPageRoot>
    );
  }

  const isSaveNoticeVisible = message?.type === 'success' && message.text === 'Сохранено';

  return (
    <AdminStickyPageRoot stickyTopPx={saveButtonPinnedTopPx} className={styles.page}>
      <div ref={pageHeaderRef} className={styles.pageHeader}>
        <div className={styles.pageHeaderMain}>
          <KnowledgeBackLink href="/admin/knowledge">← Территория знаний</KnowledgeBackLink>
          <div className={styles.titleWithSaveNotice}>
            <h1 className={styles.title}>
              {isEdit ? 'Редактирование материала' : 'Новый материал'}
            </h1>
            {isEdit ? (
              <span
                className={`${styles.statusBadge} ${
                  status === 'PUBLISHED'
                    ? styles.statusBadgePublished
                    : status === 'ARCHIVED'
                      ? styles.statusBadgeArchived
                      : styles.statusBadgeDraft
                }`}
              >
                {status === 'PUBLISHED'
                  ? 'Опубликован'
                  : status === 'ARCHIVED'
                    ? 'Архив'
                    : 'Черновик'}
              </span>
            ) : null}
            <AdminSaveNotice visible={isSaveNoticeVisible} />
          </div>
        </div>
        <div className={styles.pageHeaderActions}>
          {isSecondaryUnpublish ? (
            <>
              <button
                data-admin-mutation
                type="button"
                className={styles.unpublishButton}
                onClick={handleUnpublishClick}
                disabled={saving}
              >
                {saving ? 'Сохранение...' : secondaryButtonLabel}
              </button>
              <AdminStickySaveButtonSlot
                state={saveButtonState}
                saving={saving}
                label="Сохранить"
                onClick={handleHeaderSaveClick}
              />
            </>
          ) : (
            <>
              <button
                type="button"
                className={styles.publishButton}
                onClick={handlePublishClick}
                disabled={isPublishDisabled}
              >
                {secondaryButtonLabel}
              </button>
              <AdminStickySaveButtonSlot
                state={saveButtonState}
                saving={saving}
                label="Сохранить"
                onClick={handleHeaderSaveClick}
              />
            </>
          )}
        </div>
      </div>

      {message && message.text !== 'Сохранено' ? (
        <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>
      ) : null}

      {categories.length === 0 ? (
        <div className={`${styles.message} ${styles.error}`}>
          Сначала создайте категорию на{' '}
          <KnowledgeBackLink href="/admin/knowledge">главной странице раздела</KnowledgeBackLink>.
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
        <section className={styles.coverSection}>
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
                  data-admin-mutation
                  type="button"
                  className={styles.clearBtn}
                  onClick={handleRemoveThumbnail}
                >
                  Удалить обложку
                </button>
              ) : null}
              {thumbnailUrl ? (
                <div className={styles.thumbnailPreviewInline}>
                  <img src={publicUploadUrl(thumbnailUrl)} alt="" />
                  <button
                    data-admin-mutation
                    type="button"
                    className={styles.thumbnailRemoveBtn}
                    onClick={handleRemoveThumbnail}
                    aria-label="Удалить обложку"
                    title="Удалить обложку"
                  >
                    ✕
                  </button>
                </div>
              ) : null}
            </div>
            {thumbnailUrl ? (
              <div className={styles.thumbnailDisplayField}>
                <label htmlFor="thumbnailDisplay" className={styles.subLabel}>
                  Отображение в конспекте
                </label>
                <select
                  id="thumbnailDisplay"
                  value={thumbnailDisplay}
                  onChange={(event) =>
                    setThumbnailDisplay(event.target.value as typeof thumbnailDisplay)
                  }
                  className={styles.select}
                >
                  {KNOWLEDGE_THUMBNAIL_DISPLAY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className={styles.fieldHint}>
                  {
                    KNOWLEDGE_THUMBNAIL_DISPLAY_OPTIONS.find(
                      (option) => option.value === thumbnailDisplay
                    )?.hint
                  }{' '}
                  На странице списка материалов формат обложки не меняется.
                </p>
              </div>
            ) : null}
          </div>
        </section>

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

          <div
            className={`${styles.row} ${type === 'ARTICLE' || type === 'VIDEO' ? styles.rowThree : ''}`}
          >
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
            {type === 'ARTICLE' || type === 'VIDEO' ? (
              <div className={styles.field}>
                <label htmlFor="readingTimeMinutes" className={styles.label}>
                  {type === 'ARTICLE' ? 'Время чтения (мин)' : 'Длительность (мин)'}
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
                  placeholder={type === 'ARTICLE' ? 'Авто' : 'Например: 5'}
                  title={
                    type === 'ARTICLE'
                      ? estimatedReadingTime
                        ? `Автоподсчёт: ~${estimatedReadingTime} мин`
                        : 'Заполнится после добавления текста'
                      : 'Длительность ролика для карточки в списке материалов'
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

          {type === 'ARTICLE' || type === 'VIDEO' ? (
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
              <label className={styles.label} title="Видно всем читателям статьи">
                Практическое задание для менеджера
              </label>
              <BlogPostEditor
                value={managerPracticalAssignment}
                onChange={setManagerPracticalAssignment}
                enableTables
                enableImages
                onUploadImage={handleContentImageUpload}
                onImageUploadError={handleContentImageUploadError}
                compact
                placeholder="Задание для применения материала на практике. Для картинок — кнопка 🖼."
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
              <div className={styles.videoUploadRow}>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,.mp4"
                  onChange={handleVideoUpload}
                  className={styles.hiddenInput}
                />
                <button
                  type="button"
                  className={styles.uploadBtn}
                  onClick={() => videoInputRef.current?.click()}
                  disabled={uploadingVideo}
                >
                  {uploadingVideo ? `Загрузка ${videoUploadPercent}%` : 'Загрузить MP4'}
                </button>
                {videoUrl.trim() ? (
                  <button
                    data-admin-mutation
                    type="button"
                    className={styles.clearBtn}
                    onClick={() => setVideoUrl('')}
                    disabled={uploadingVideo}
                  >
                    Очистить
                  </button>
                ) : null}
              </div>
              {uploadingVideo ? (
                <div
                  className={styles.videoUploadProgress}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={videoUploadPercent}
                  aria-label="Прогресс загрузки видео"
                >
                  <div className={styles.videoUploadProgressTrack}>
                    <VideoProgressFill
                      percent={videoUploadPercent}
                      className={styles.videoUploadProgressFill}
                    />
                  </div>
                  <span className={styles.videoUploadProgressLabel}>{videoUploadPercent}%</span>
                </div>
              ) : null}
              <input
                id="videoUrl"
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className={styles.input}
                placeholder="https://www.youtube.com/watch?v=..., Rutube, VK, Vimeo или прямой URL"
                disabled={uploadingVideo}
              />
              <p className={styles.hint}>
                Загрузите MP4 (до 300 МБ) или вставьте ссылку YouTube, Rutube, VK, Vimeo либо прямой
                URL на видеофайл
              </p>
            </div>
            {videoUrl.trim() ? (
              <div className={styles.preview}>
                <p className={styles.previewLabel}>Предпросмотр</p>
                <KnowledgeVideoPlayer
                  materialId={materialId || 'preview'}
                  url={videoUrl}
                  title={title || 'Видео'}
                  canTrackProgress={false}
                />
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
              enableImages
              onUploadImage={handleContentImageUpload}
              onImageUploadError={handleContentImageUploadError}
              placeholder="Инструкция, регламент, пошаговое руководство… Для таблиц — кнопка ⊞, для картинок в тексте — 🖼."
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

        {type === 'ARTICLE' ? (
          <KnowledgeQuizEditor materialId={materialId} saveRef={quizEditorRef} />
        ) : null}

        <section className={styles.settingsSection}>
          <div className={styles.settingsRow}>
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
      </div>
    </AdminStickyPageRoot>
  );
}
