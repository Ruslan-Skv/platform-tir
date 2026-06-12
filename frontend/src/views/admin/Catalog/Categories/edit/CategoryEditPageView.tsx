'use client';

import { CATEGORY_ICONS } from '../shared/categories-page.constants';
import styles from './CategoryEditPage.module.css';
import type { CategoryEditPageModel } from './hooks/useCategoryEditPage';

type CategoryEditPageViewProps = {
  model: CategoryEditPageModel;
};

export function CategoryEditPageView({ model }: CategoryEditPageViewProps) {
  const {
    loading,
    saving,
    error,
    message,
    category,
    formData,
    setFormData,
    showIconPicker,
    setShowIconPicker,
    imagePreview,
    fileInputRef,
    flatCategories,
    generateSlug,
    goBack,
    handleImageSelect,
    clearImage,
    handleSave,
  } = model;

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Загрузка категории...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <p>{error}</p>
          <button type="button" className={styles.backButton} onClick={goBack}>
            ← Вернуться к списку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button type="button" className={styles.backButton} onClick={goBack}>
          ← Назад
        </button>
        <h1 className={styles.title}>Редактирование категории</h1>
      </div>

      <div className={styles.card}>
        {message && (
          <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>
        )}

        <div className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Название *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    name,
                    slug: category?.slug === prev.slug ? generateSlug(name) : prev.slug,
                  }));
                }}
                placeholder="Название категории"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Slug (URL) *</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, slug: e.target.value.toLowerCase() }))
                }
                placeholder="category-slug"
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Родительская категория</label>
              <select
                value={formData.parentId}
                onChange={(e) => setFormData((prev) => ({ ...prev, parentId: e.target.value }))}
                className={styles.select}
              >
                <option value="">Без родителя (корневая)</option>
                {flatCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Порядок сортировки</label>
              <input
                type="number"
                value={formData.order}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, order: parseInt(e.target.value, 10) || 0 }))
                }
                min="0"
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Описание</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Описание категории"
              className={styles.textarea}
              rows={4}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Иконка или изображение</label>
            <div className={styles.iconImageSection}>
              <div className={styles.iconPickerWrapper}>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => setShowIconPicker(!showIconPicker)}
                >
                  {formData.icon || '📁'} Выбрать иконку
                </button>
                {showIconPicker && (
                  <div className={styles.iconPicker}>
                    <div className={styles.iconGrid}>
                      {CATEGORY_ICONS.map((icon, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`${styles.iconOption} ${formData.icon === icon ? styles.iconSelected : ''}`}
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, icon }));
                            setShowIconPicker(false);
                          }}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                    {formData.icon ? (
                      <button
                        type="button"
                        className={styles.clearIconButton}
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, icon: '' }));
                          setShowIconPicker(false);
                        }}
                      >
                        Очистить иконку
                      </button>
                    ) : null}
                  </div>
                )}
              </div>

              <span className={styles.orDivider}>или</span>

              <div className={styles.imageUploadWrapper}>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageSelect}
                  className={styles.fileInput}
                  id="category-image-edit"
                />
                <label htmlFor="category-image-edit" className={styles.uploadButton}>
                  📷 Загрузить картинку
                </label>
              </div>
            </div>

            {(formData.icon || imagePreview) && (
              <div className={styles.previewSection}>
                <span className={styles.previewLabel}>Предпросмотр:</span>
                <div className={styles.preview}>
                  {imagePreview ? (
                    <div className={styles.imagePreviewWrapper}>
                      <img src={imagePreview} alt="Preview" className={styles.imagePreview} />
                      <button
                        type="button"
                        className={styles.removeImageButton}
                        onClick={clearImage}
                      >
                        ✕
                      </button>
                    </div>
                  ) : formData.icon ? (
                    <span className={styles.iconPreview}>{formData.icon}</span>
                  ) : null}
                  <span className={styles.previewName}>
                    {formData.name || 'Название категории'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                className={styles.checkbox}
              />
              <span>Категория активна (отображается на сайте)</span>
            </label>
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={goBack} disabled={saving}>
            Отмена
          </button>
          <button
            type="button"
            className={styles.saveButton}
            onClick={() => void handleSave()}
            disabled={saving || !formData.name || !formData.slug}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}
