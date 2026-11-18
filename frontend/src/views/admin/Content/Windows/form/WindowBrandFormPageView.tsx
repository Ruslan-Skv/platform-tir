'use client';

import Link from 'next/link';

import styles from './WindowsFormPage.module.css';
import type { WindowBrandFormPageModel } from './hooks/useWindowBrandFormPage';
import { getWindowsImageUrl } from './windows-form.utils';

type WindowBrandFormPageViewProps = {
  model: WindowBrandFormPageModel;
};

export function WindowBrandFormPageView({ model }: WindowBrandFormPageViewProps) {
  const {
    brandId,
    fileInputRef,
    name,
    setName,
    slug,
    setSlug,
    logoUrl,
    setLogoUrl,
    country,
    setCountry,
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
        <Link href="/admin/content/windows" className={styles.backLink}>
          ← К разделу «Окна»
        </Link>
        <h1 className={styles.title}>{brandId ? 'Редактировать бренд' : 'Новый бренд профилей'}</h1>
      </div>

      {message && <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>}

      <div className={styles.form}>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Название бренда *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="REHAU"
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Slug (вкладка на сайте: /windows#…) *</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="rehau"
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Логотип (необязательно)</label>
          <div className={styles.imageBlock}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className={styles.fileInput}
            />
            {logoUrl ? (
              <div className={styles.imagePreview}>
                {}
                <img src={getWindowsImageUrl(logoUrl)} alt={name || 'Логотип'} />
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
                    onClick={() => setLogoUrl('')}
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
                {uploading ? 'Загрузка...' : '+ Загрузить логотип'}
              </button>
            )}
          </div>
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Страна бренда</label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Германия"
              className={styles.input}
            />
          </div>
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
          <label className={styles.label}>Описание бренда</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Короткий текст о производителе для вкладки бренда..."
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
            Бренд активен (вкладка видна на сайте)
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
          <Link href="/admin/content/windows" className={styles.cancelLink}>
            К списку
          </Link>
        </div>
      </div>
    </div>
  );
}
