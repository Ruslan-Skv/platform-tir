'use client';

import { categories } from '@/widgets/home/lib/constants';

import { SectionVisibilityCheckbox } from '../shared/SectionVisibilityCheckbox';
import styles from './HomeDirectionsPage.module.css';
import type { HomeDirectionsPageModel } from './hooks/useHomeDirectionsPage';

type HomeDirectionsPageViewProps = {
  model: HomeDirectionsPageModel;
};

export function HomeDirectionsPageView({ model }: HomeDirectionsPageViewProps) {
  const {
    images,
    loading,
    uploading,
    error,
    success,
    previewUrl,
    handleFileChange,
    setFileInputRef,
    triggerFileInput,
  } = model;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Наши направления — картинки</h1>
        <p className={styles.subtitle}>
          Загрузите или замените изображения для раздела «Наши направления» на главной странице.
          Допустимые форматы: JPG, PNG, WebP, GIF. Размер до 5 МБ.
        </p>
      </header>

      <SectionVisibilityCheckbox sectionKey="directionsVisible" sectionLabel="Наши направления" />

      {loading ? (
        <p>Загрузка...</p>
      ) : (
        <div className={styles.grid}>
          {categories.map((cat) => {
            const url = previewUrl(images[cat.slug] ?? '');
            return (
              <div key={cat.slug} className={styles.card}>
                <h3 className={styles.cardTitle}>{cat.name}</h3>
                {url ? (
                  <img src={url} alt={cat.name} className={styles.preview} />
                ) : (
                  <div className={styles.placeholder}>Картинка по умолчанию</div>
                )}
                <div className={styles.actions}>
                  <input
                    ref={(el) => setFileInputRef(cat.slug, el)}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className={styles.fileInput}
                    onChange={(e) => handleFileChange(cat.slug, e)}
                  />
                  <button
                    type="button"
                    className={styles.uploadBtn}
                    disabled={uploading !== null}
                    onClick={() => triggerFileInput(cat.slug)}
                  >
                    {uploading === cat.slug ? 'Загрузка...' : 'Загрузить изображение'}
                  </button>
                </div>
                {error && uploading === cat.slug && <p className={styles.error}>{error}</p>}
                {success && uploading !== cat.slug && <p className={styles.success}>{success}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
