'use client';

import Link from 'next/link';

import styles from './FurnitureFormPage.module.css';
import { getFurnitureImageUrl } from './furniture-form.utils';
import type { FurnitureCategoryFormPageModel } from './hooks/useFurnitureCategoryFormPage';

type FurnitureCategoryFormPageViewProps = {
  model: FurnitureCategoryFormPageModel;
};

export function FurnitureCategoryFormPageView({ model }: FurnitureCategoryFormPageViewProps) {
  const {
    categoryId,
    fileInputRef,
    name,
    setName,
    slug,
    setSlug,
    imageUrl,
    setImageUrl,
    description,
    setDescription,
    sortOrder,
    setSortOrder,
    isActive,
    setIsActive,
    loading,
    saving,
    uploading,
    message,
    handleSave,
    handleFileSelect,
  } = model;

  if (loading) {
    return <div className={styles.page}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/admin/content/furniture" className={styles.backLink}>
          ← К разделу «Мебель»
        </Link>
        <h1 className={styles.title}>
          {categoryId ? 'Редактировать категорию' : 'Новая категория изделий'}
        </h1>
      </div>

      {message && <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>}

      <div className={styles.form}>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Название категории *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Кухни"
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Slug (вкладка на сайте: /furniture#…) *</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="kuhni"
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Изображение категории (необязательно)</label>
          <div className={styles.imageBlock}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className={styles.fileInput}
            />
            {imageUrl ? (
              <div className={styles.imagePreview}>
                {}
                <img src={getFurnitureImageUrl(imageUrl)} alt={name || 'Категория'} />
                <div className={styles.imageActions}>
                  <button
                    type="button"
                    className={styles.changeImageBtn}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? 'Загрузка...' : 'Заменить'}
                  </button>
                  <button
                    type="button"
                    className={styles.changeImageBtn}
                    onClick={() => setImageUrl('')}
                    disabled={uploading}
                  >
                    Убрать
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className={styles.uploadBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Загрузка...' : '+ Загрузить изображение'}
              </button>
            )}
          </div>
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Порядок вывода</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Описание категории</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Короткий текст о виде мебели для вкладки..."
            className={styles.textarea}
            rows={4}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className={styles.checkbox}
            />
            Категория активна (вкладка видна на сайте)
          </label>
        </div>

        <div className={styles.actions}>
          <button
            data-admin-mutation
            type="button"
            className={styles.saveButton}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <Link href="/admin/content/furniture" className={styles.cancelLink}>
            К списку
          </Link>
        </div>
      </div>
    </div>
  );
}
