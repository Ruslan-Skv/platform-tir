'use client';

import styles from '../ProductEditPage.module.css';

type ProductEditVariantsSectionProps = {
  sizes: string[];
  openingSide: string[];
  suggestedSizes: string[];
  sizesHighlight: boolean;
  onSizesChange: (sizes: string[]) => void;
  onOpeningSideChange: (openingSide: string[]) => void;
};

export function ProductEditVariantsSection({
  sizes,
  openingSide,
  suggestedSizes,
  sizesHighlight,
  onSizesChange,
  onOpeningSideChange,
}: ProductEditVariantsSectionProps) {
  const toggleOpeningSide = (side: 'правое' | 'левое', checked: boolean) => {
    onOpeningSideChange(checked ? [...openingSide, side] : openingSide.filter((s) => s !== side));
  };

  return (
    <div className={styles.formSection}>
      <h2 className={styles.sectionTitle}>Варианты исполнения</h2>

      <div className={styles.formGroup}>
        <label>Размеры *</label>
        <div
          className={
            sizesHighlight ? styles.fieldHighlightBlockFilled : styles.fieldHighlightBlockEmpty
          }
        >
          {suggestedSizes.length > 0 && (
            <div className={styles.sizesHint}>
              <span className={styles.sizesHintLabel}>
                Подсказка: размеры из других товаров категории —
              </span>
              <div className={styles.sizesHintChips}>
                {suggestedSizes.map((size) => {
                  const alreadyAdded = sizes.some(
                    (s) => s.trim().toLowerCase() === size.trim().toLowerCase()
                  );
                  return (
                    <button
                      key={size}
                      type="button"
                      className={styles.sizesHintChip}
                      disabled={alreadyAdded}
                      onClick={() => {
                        const trimmed = size.trim();
                        if (!trimmed) return;
                        const exists = sizes.some(
                          (s) => s.trim().toLowerCase() === trimmed.toLowerCase()
                        );
                        if (exists) return;
                        const base = sizes.filter((s) => s.trim() !== '');
                        onSizesChange(base.length ? [...base, trimmed] : [trimmed]);
                      }}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className={`${styles.attributesList} ${styles.sizesListTwoCol}`}>
            {(sizes.length > 0 ? sizes : ['']).map((size, index) => (
              <div key={`size-${index}`} className={styles.attributeRow}>
                <input
                  type="text"
                  value={size}
                  onChange={(e) => {
                    const nextSizes = sizes.length > 0 ? [...sizes] : [''];
                    nextSizes[index] = e.target.value;
                    onSizesChange(nextSizes);
                  }}
                  className={styles.input}
                  placeholder="60x200"
                  aria-label={`Размер ${index + 1}`}
                />
                {sizes.length > 1 && (
                  <button
                    type="button"
                    className={styles.removeAttrButton}
                    onClick={() => onSizesChange(sizes.filter((_, i) => i !== index))}
                    title="Удалить"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            className={styles.addAttrButton}
            onClick={() => onSizesChange([...sizes, ''])}
          >
            + Добавить размер
          </button>
          <p className={styles.hint}>
            Добавьте один или несколько размеров. Если не указано, параметр не будет отображаться в
            публичке.
          </p>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="openingSide">Сторона открывания</label>
        <div
          className={`${styles.checkboxGroup} ${styles.checkboxGroupRow} ${styles.openingSideRow}`}
        >
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={openingSide.includes('правое')}
              onChange={(e) => toggleOpeningSide('правое', e.target.checked)}
            />
            <span>Правое</span>
          </label>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={openingSide.includes('левое')}
              onChange={(e) => toggleOpeningSide('левое', e.target.checked)}
            />
            <span>Левое</span>
          </label>
        </div>
        <p className={styles.hint}>
          Выберите доступные стороны открывания. Если ничего не выбрано, параметр не будет
          отображаться в публичке.
        </p>
      </div>
    </div>
  );
}
