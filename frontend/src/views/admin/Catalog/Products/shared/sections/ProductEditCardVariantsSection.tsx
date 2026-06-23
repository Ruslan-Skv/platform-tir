'use client';

import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

import styles from '../ProductEditPage.module.css';
import { type ProductCardVariantForm, emptyCardVariant } from '../product-form-utils';

type ProductEditCardVariantsSectionProps = {
  cardVariants: ProductCardVariantForm[];
  onCardVariantsChange: (variants: ProductCardVariantForm[]) => void;
  onVariantImageUpload: (file: File, index: number) => Promise<void>;
};

export function ProductEditCardVariantsSection({
  cardVariants,
  onCardVariantsChange,
  onVariantImageUpload,
}: ProductEditCardVariantsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadIndex, setUploadIndex] = useState<number | null>(null);

  const displayVariants = cardVariants.length > 0 ? cardVariants : [emptyCardVariant(0)];

  const updateVariant = (index: number, patch: Partial<ProductCardVariantForm>) => {
    const next = [...cardVariants];
    if (next[index] === undefined) {
      next[index] = emptyCardVariant(index);
    }
    next[index] = { ...next[index], ...patch };
    onCardVariantsChange(next);
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploadIndex === null) return;
    await onVariantImageUpload(file, uploadIndex);
    setUploadIndex(null);
    e.target.value = '';
  };

  return (
    <div className={styles.formSection}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className={styles.fileInput}
        onChange={(e) => void handleFileChange(e)}
      />
      <h2 className={styles.sectionTitle}>Схожие товары в карточке</h2>
      <p className={`${styles.hint} ${styles.hintSpaced}`}>
        До 5 вариантов в одной карточке (как на Wildberries/Озон): отличаются ценой, размером, фото,
        наименованием, цветом, доп. опцией. Пользователь выбирает нужный вариант прямо в карточке.
      </p>
      {displayVariants.map((variant, index) => (
        <div key={`card-variant-${index}`} className={styles.cardVariantBlock}>
          <h3 className={styles.cardVariantBlockTitle}>Вариант {index + 1}</h3>
          <div className={styles.formRow}>
            <div className={`${styles.formGroup} ${styles.formGroupWide}`}>
              <label>Наименование *</label>
              <input
                type="text"
                value={variant.name}
                onChange={(e) => updateVariant(index, { name: e.target.value })}
                className={styles.input}
                placeholder="Например: Дверь белая 60×200"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Цена *</label>
              <input
                type="text"
                inputMode="decimal"
                value={variant.price}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                  updateVariant(index, { price: v });
                }}
                className={styles.input}
                placeholder="0"
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>Фото</label>
            <div className={styles.cardVariantImageRow}>
              <input
                type="text"
                value={variant.image}
                onChange={(e) => updateVariant(index, { image: e.target.value })}
                className={styles.input}
                placeholder="URL или загрузите файл"
              />
              <button
                type="button"
                className={styles.cardVariantUploadBtn}
                onClick={() => {
                  setUploadIndex(index);
                  fileInputRef.current?.click();
                }}
              >
                Загрузить фото
              </button>
            </div>
            {variant.image && (
              <div className={styles.cardVariantImagePreview}>
                <img src={variant.image} alt="" />
              </div>
            )}
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Размер</label>
              <input
                type="text"
                value={variant.size}
                onChange={(e) => updateVariant(index, { size: e.target.value })}
                className={styles.input}
                placeholder="60×200"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Цвет</label>
              <input
                type="text"
                value={variant.color}
                onChange={(e) => updateVariant(index, { color: e.target.value })}
                className={styles.input}
                placeholder="Белый"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Доп. опция</label>
              <input
                type="text"
                value={variant.extraOption}
                onChange={(e) => updateVariant(index, { extraOption: e.target.value })}
                className={styles.input}
                placeholder="С подсветкой"
              />
            </div>
          </div>
          {cardVariants.length > 0 && (
            <button
              data-admin-mutation
              type="button"
              className={styles.cardVariantRemoveButton}
              onClick={() => onCardVariantsChange(cardVariants.filter((_, i) => i !== index))}
              title="Удалить вариант"
              aria-label="Удалить вариант"
            >
              🗑️
            </button>
          )}
        </div>
      ))}
      {cardVariants.length < 5 && (
        <button
          data-admin-mutation
          type="button"
          className={styles.addAttrButton}
          onClick={() =>
            onCardVariantsChange([...cardVariants, emptyCardVariant(cardVariants.length)])
          }
        >
          + Добавить вариант (макс. 5)
        </button>
      )}
    </div>
  );
}
