'use client';

import type { ChangeEvent } from 'react';

import styles from '../ProductEditPage.module.css';

type BadgeDefinition = { id: string; key: string; label: string; sortOrder: number };

type ProductEditCardBadgesSectionProps = {
  isFeatured: boolean;
  isNew: boolean;
  catalogBadgeIds: string[];
  badgeDefinitions: BadgeDefinition[];
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onToggleCatalogBadge: (badgeId: string) => void;
};

export function ProductEditCardBadgesSection({
  isFeatured,
  isNew,
  catalogBadgeIds,
  badgeDefinitions,
  onChange,
  onToggleCatalogBadge,
}: ProductEditCardBadgesSectionProps) {
  return (
    <div
      className={`${styles.formSection} ${styles.formSectionFullWidth} ${styles.formSectionCompact}`}
    >
      <h2 className={styles.sectionTitle}>Бэйджи карточки товара</h2>

      <h3 className={`${styles.subsectionTitle} ${styles.subsectionTitleFirst}`}>
        Справа от фото (текстовые)
      </h3>
      <div className={`${styles.checkboxGroup} ${styles.checkboxGroupRow} ${styles.textBadgesRow}`}>
        <label className={styles.checkbox}>
          <input type="checkbox" name="isFeatured" checked={isFeatured} onChange={onChange} />
          <span>ХИТ</span>
        </label>
        <label className={styles.checkbox}>
          <input type="checkbox" name="isNew" checked={isNew} onChange={onChange} />
          <span>Новинка</span>
        </label>
      </div>
      <p className={styles.hintTight}>
        Скидка и «Видео» на сайте — автоматически при старой цене и ссылке на видео.
      </p>

      <h3 className={`${styles.subsectionTitle} ${styles.subsectionTitleSpaced}`}>
        Слева от фото (картинки, не более 5)
      </h3>
      <p className={styles.hintTight}>
        PNG или JPG в «Настройки → Бэйджи карточек». Выбрано: {catalogBadgeIds.length} / 5.
      </p>
      <div className={styles.cardBadgesPickGrid}>
        {badgeDefinitions.map((b) => (
          <label key={b.id} className={`${styles.checkbox} ${styles.checkboxBadgesPick}`}>
            <input
              type="checkbox"
              checked={catalogBadgeIds.includes(b.id)}
              onChange={() => onToggleCatalogBadge(b.id)}
            />
            <span>{b.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
