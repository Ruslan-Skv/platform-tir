'use client';

import type { ChangeEvent } from 'react';

import styles from '../ProductEditPage.module.css';

type ProductEditSeoSectionProps = {
  seoTitle: string;
  seoDescription: string;
  onSeoTitleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSeoDescriptionChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
};

export function ProductEditSeoSection({
  seoTitle,
  seoDescription,
  onSeoTitleChange,
  onSeoDescriptionChange,
}: ProductEditSeoSectionProps) {
  return (
    <div className={`${styles.formSection} ${styles.formSectionFullWidth}`}>
      <h2 className={styles.sectionTitle}>SEO</h2>

      <div className={styles.formGroup}>
        <label htmlFor="seoTitle">SEO заголовок</label>
        <input
          type="text"
          id="seoTitle"
          name="seoTitle"
          value={seoTitle}
          onChange={onSeoTitleChange}
          className={styles.input}
          placeholder="Название товара - Категория | Сайт"
          maxLength={70}
        />
        <p className={styles.hint}>
          Генерируется автоматически при изменении названия. Рекомендуемая длина: до 70 символов (
          {seoTitle.length}/70)
        </p>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="seoDescription">SEO описание</label>
        <textarea
          id="seoDescription"
          name="seoDescription"
          value={seoDescription}
          onChange={onSeoDescriptionChange}
          rows={3}
          className={styles.textarea}
          placeholder="Купить [товар] в категории [категория]. Гарантия качества."
          maxLength={160}
        />
        <p className={styles.hint}>
          Генерируется автоматически при изменении названия/цены. Рекомендуемая длина: до 160
          символов ({seoDescription.length}/160)
        </p>
      </div>
    </div>
  );
}
