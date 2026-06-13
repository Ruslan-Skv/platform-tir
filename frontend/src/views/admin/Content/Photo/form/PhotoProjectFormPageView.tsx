'use client';

import Link from 'next/link';

import type { PhotoDisplayMode } from '@/shared/api/admin-photo';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';

import styles from './PhotoProjectFormPage.module.css';
import type { PhotoProjectFormPageModel } from './hooks/usePhotoProjectFormPage';
import { PHOTO_DISPLAY_MODES } from './photo-project-form-page.constants';

type PhotoProjectFormPageViewProps = {
  model: PhotoProjectFormPageModel;
};

export function PhotoProjectFormPageView({ model }: PhotoProjectFormPageViewProps) {
  const {
    projectId,
    categories,
    categoryId,
    setCategoryId,
    title,
    setTitle,
    description,
    setDescription,
    displayMode,
    setDisplayMode,
    displayModeMobile,
    setDisplayModeMobile,
    publishedAtLocal,
    setPublishedAtLocal,
    photos,
    loading,
    saving,
    uploading,
    message,
    fileInputRef,
    handleSave,
    handleFileSelect,
    handleRemovePhoto,
  } = model;

  if (loading && projectId) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/admin/content/photo" className={styles.backLink}>
          ← К списку
        </Link>
        <h1 className={styles.title}>{projectId ? 'Редактирование объекта' : 'Новый объект'}</h1>
      </div>

      {message && <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>}

      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
      >
        <div className={styles.formGroup}>
          <label className={styles.label}>Категория *</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={styles.select}
            required
          >
            <option value="">Выберите категорию</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Название объекта *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Квартира ул. Ленина 15"
            className={styles.input}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Дата и время на сайте</label>
          <p className={styles.fieldHint}>
            Показывается в разделе «Наши работы» у посетителей. Не привязана к моменту сохранения
            записи в админке.
          </p>
          <input
            type="datetime-local"
            value={publishedAtLocal}
            onChange={(e) => setPublishedAtLocal(e.target.value)}
            className={styles.input}
            step={60}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Описание выполненных работ</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Опишите выполненные работы..."
            className={styles.textarea}
            rows={14}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Отображение на компьютере и планшете</label>
          <p className={styles.fieldHint}>Ширина экрана больше 768 px</p>
          <select
            value={displayMode}
            onChange={(e) => setDisplayMode(e.target.value as PhotoDisplayMode)}
            className={styles.select}
          >
            {PHOTO_DISPLAY_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Отображение на телефоне</label>
          <p className={styles.fieldHint}>Ширина экрана до 768 px включительно</p>
          <select
            value={displayModeMobile}
            onChange={(e) => setDisplayModeMobile(e.target.value as PhotoDisplayMode)}
            className={styles.select}
          >
            {PHOTO_DISPLAY_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Фотографии</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className={styles.hiddenFileInput}
          />
          <button
            type="button"
            className={styles.uploadButton}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Загрузка...' : '+ Загрузить фото (можно несколько)'}
          </button>
          {photos.length > 0 && (
            <div className={styles.photosGrid}>
              {photos.map((photo) => (
                <div key={photo.id} className={styles.photoItem}>
                  <img src={publicUploadUrl(photo.imageUrl)} alt="" />
                  <button
                    type="button"
                    className={styles.removePhoto}
                    onClick={() => void handleRemovePhoto(photo.id)}
                    aria-label="Удалить"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.saveButton} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <Link href="/admin/content/photo" className={styles.cancelLink}>
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
