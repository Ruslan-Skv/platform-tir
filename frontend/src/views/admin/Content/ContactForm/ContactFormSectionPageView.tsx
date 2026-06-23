'use client';

import styles from '../FeaturedProducts/FeaturedProductsSectionPage.module.css';
import { SectionVisibilityCheckbox } from '../shared/SectionVisibilityCheckbox';
import type { ContactFormSectionPageModel } from './hooks/useContactFormSectionPage';

type ContactFormSectionPageViewProps = {
  model: ContactFormSectionPageModel;
};

export function ContactFormSectionPageView({ model }: ContactFormSectionPageViewProps) {
  const {
    data,
    loading,
    saving,
    uploading,
    message,
    fileInputRef,
    handleSave,
    handleChange,
    handleOpacityChange,
    handleFileChange,
    handleBackgroundImageChange,
  } = model;

  if (loading || !data) {
    return (
      <div className={styles.page}>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Контактная форма</h1>
        <p className={styles.subtitle}>
          Настройки блока «Контактная форма» на главной странице. Заголовок и подзаголовок
          отображаются над кнопками «Заказать звонок» и «Вызвать замерщика».
        </p>
      </header>

      <SectionVisibilityCheckbox sectionKey="contactFormVisible" sectionLabel="Контактная форма" />

      {message && (
        <div
          className={`${message.type === 'success' ? styles.success : styles.error} ${styles.toast}`}
        >
          {message.text}
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Настройки блока</h2>
        <div className={styles.formGroup}>
          <label>Заголовок</label>
          <input
            type="text"
            value={data.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className={styles.input}
            placeholder="Готовы начать проект?"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Подзаголовок</label>
          <input
            type="text"
            value={data.subtitle}
            onChange={(e) => handleChange('subtitle', e.target.value)}
            className={styles.input}
            placeholder="Оставьте заявку и получите бесплатную консультацию специалиста"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Фоновая картинка</label>
          <p className={styles.hint}>
            URL картинки или загрузите файл (JPG, PNG, WebP, GIF, до 5 МБ). Картинка отображается
            полупрозрачно под текстом блока.
          </p>
          <div className={styles.inputRow}>
            <input
              type="text"
              value={data.backgroundImage ?? ''}
              onChange={(e) => handleBackgroundImageChange(e.target.value)}
              className={styles.input}
              placeholder="https://… или оставьте пустым"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className={styles.fileInput}
              onChange={handleFileChange}
            />
            <button
              type="button"
              className={styles.uploadBtn}
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? 'Загрузка…' : 'Загрузить файл'}
            </button>
          </div>
          {(data.backgroundImage ?? '').trim() ? (
            <p className={styles.previewHint}>Текущее изображение будет использовано как фон.</p>
          ) : null}
        </div>
        <div className={styles.formGroup}>
          <label>Прозрачность фона</label>
          <p className={styles.hint}>
            От 0 (невидимый) до 100% (полностью видимый). Рекомендуется 30–60%.
          </p>
          <div className={styles.sliderRow}>
            <input
              type="range"
              min={0}
              max={100}
              value={data.backgroundOpacity != null ? Math.round(data.backgroundOpacity * 100) : 50}
              onChange={(e) => handleOpacityChange(Number(e.target.value) / 100)}
              className={styles.range}
            />
            <span className={styles.rangeValue}>
              {data.backgroundOpacity != null
                ? `${Math.round(data.backgroundOpacity * 100)}%`
                : '50%'}
            </span>
          </div>
        </div>
        <div className={styles.saveBlock}>
          <button
            data-admin-mutation
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </section>
    </div>
  );
}
