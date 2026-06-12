'use client';

import Link from 'next/link';

import styles from './PromotionFormPage.module.css';
import type { PromotionFormPageModel } from './hooks/usePromotionFormPage';
import { getPromotionImageUrl } from './promotions-page.utils';

type PromotionFormPageViewProps = {
  model: PromotionFormPageModel;
};

export function PromotionFormPageView({ model }: PromotionFormPageViewProps) {
  const {
    promotionId,
    fileInputRef,
    title,
    setTitle,
    slug,
    setSlug,
    imageUrl,
    description,
    setDescription,
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
        <Link href="/admin/content/promotions" className={styles.backLink}>
          ← К списку акций
        </Link>
        <h1 className={styles.title}>{promotionId ? 'Редактировать акцию' : 'Новая акция'}</h1>
      </div>

      {message && <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>}

      <div className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Название *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Скидка 15% на входные двери"
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Slug *</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="discount-entrance-doors"
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Изображение *</label>
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
                <img src={getPromotionImageUrl(imageUrl)} alt={title || 'Превью'} />
                <button
                  type="button"
                  className={styles.changeImageBtn}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Загрузка...' : 'Заменить'}
                </button>
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

        <div className={styles.field}>
          <label className={styles.label}>Описание (необязательно)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Описание акции..."
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
            Акция активна (отображается на сайте)
          </label>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.saveButton}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <Link href="/admin/content/promotions" className={styles.cancelLink}>
            Отмена
          </Link>
        </div>
      </div>
    </div>
  );
}
