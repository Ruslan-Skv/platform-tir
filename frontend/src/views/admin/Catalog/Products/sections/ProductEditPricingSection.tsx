'use client';

import type { ChangeEvent } from 'react';

import styles from '../ProductEditPage.module.css';
import { adminProductFieldHighlightClass } from '../product-form-required-fields';

type ProductEditFormData = {
  price: string;
  comparePrice: string;
  stock: number;
  sortOrder: number;
  onOrder: boolean;
  isActive: boolean;
};

type ReqHighlight = {
  price: boolean;
  stock: boolean;
};

type ProductEditPricingSectionProps = {
  formData: ProductEditFormData;
  onFormPatch: (patch: Partial<ProductEditFormData>) => void;
  reqHighlight: ReqHighlight;
  handlePriceChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleIntegerChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleChange: (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void;
};

export function ProductEditPricingSection({
  formData,
  onFormPatch,
  reqHighlight,
  handlePriceChange,
  handleIntegerChange,
  handleChange,
}: ProductEditPricingSectionProps) {
  return (
    <div
      className={`${styles.formSection} ${styles.formSectionFullWidth} ${styles.formSectionCompact} ${styles.formSectionPricingTight}`}
    >
      <h2 className={styles.sectionTitle}>Цена и наличие</h2>

      <div className={styles.pricingOneRow}>
        <div className={styles.formGroup}>
          <label htmlFor="price">Цена *</label>
          <input
            type="text"
            inputMode="decimal"
            id="price"
            name="price"
            value={formData.price}
            onChange={handlePriceChange}
            required
            className={`${styles.input} ${adminProductFieldHighlightClass(reqHighlight.price, styles)}`}
            placeholder="0.00"
            autoComplete="off"
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="comparePrice" title="Для скидки на витрине">
            Старая цена
          </label>
          <input
            type="text"
            inputMode="decimal"
            id="comparePrice"
            name="comparePrice"
            value={formData.comparePrice}
            onChange={handlePriceChange}
            className={styles.input}
            placeholder="0.00"
            autoComplete="off"
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="stock" title="Остаток на складе">
            Остаток *
          </label>
          <input
            type="text"
            inputMode="numeric"
            id="stock"
            name="stock"
            value={formData.stock}
            onChange={handleIntegerChange}
            required
            className={`${styles.input} ${adminProductFieldHighlightClass(reqHighlight.stock, styles)}`}
            placeholder="0"
            autoComplete="off"
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="sortOrder" title="Меньше число — выше в списке">
            Сортировка
          </label>
          <input
            type="number"
            id="sortOrder"
            name="sortOrder"
            value={formData.sortOrder}
            onChange={(e) => onFormPatch({ sortOrder: parseInt(e.target.value, 10) || 400 })}
            className={styles.input}
            placeholder="400"
          />
        </div>
        <div
          className={`${styles.checkboxGroup} ${styles.checkboxGroupRow} ${styles.pricingInlineChecks}`}
        >
          <label
            className={styles.checkbox}
            title="При нулевом остатке на витрине — «Под заказ»; при остатке больше нуля — «В наличии»."
          >
            <input
              type="checkbox"
              checked={formData.onOrder}
              onChange={(e) => onFormPatch({ onOrder: e.target.checked })}
            />
            <span>Под заказ</span>
          </label>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
            />
            <span>Активен (на сайте)</span>
          </label>
        </div>
      </div>
    </div>
  );
}
