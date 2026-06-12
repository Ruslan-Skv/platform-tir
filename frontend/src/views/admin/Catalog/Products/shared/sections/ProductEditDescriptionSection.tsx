'use client';

import type { ChangeEvent } from 'react';

import styles from '../ProductEditPage.module.css';

type ProductEditDescriptionSectionProps = {
  description: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
};

export function ProductEditDescriptionSection({
  description,
  onChange,
}: ProductEditDescriptionSectionProps) {
  return (
    <div className={`${styles.formSection} ${styles.formSectionFullWidth}`}>
      <h2 className={styles.sectionTitle}>Описание</h2>

      <div className={styles.formGroup}>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={onChange}
          rows={8}
          className={styles.textarea}
          placeholder="Подробное описание товара..."
        />
      </div>
    </div>
  );
}
