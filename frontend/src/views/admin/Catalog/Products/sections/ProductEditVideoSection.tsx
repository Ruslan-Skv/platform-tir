'use client';

import type { ChangeEvent } from 'react';

import styles from '../ProductEditPage.module.css';

type ProductEditVideoSectionProps = {
  videoUrl: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
};

export function ProductEditVideoSection({ videoUrl, onChange }: ProductEditVideoSectionProps) {
  return (
    <div className={`${styles.formSection} ${styles.formSectionFullWidth}`}>
      <h2 className={styles.sectionTitle}>Видеоролик о товаре</h2>
      <p className={styles.dropZoneHint}>
        Укажите ссылку на видео (YouTube, Vimeo или прямой URL на файл). На карточке товара будет
        отображаться кнопка просмотра.
      </p>
      <div className={styles.formGroup}>
        <label htmlFor="videoUrl" className={styles.label}>
          URL видеоролика
        </label>
        <input
          id="videoUrl"
          name="videoUrl"
          type="url"
          value={videoUrl}
          onChange={onChange}
          className={styles.input}
          placeholder="https://www.youtube.com/watch?v=... или https://..."
        />
      </div>
    </div>
  );
}
