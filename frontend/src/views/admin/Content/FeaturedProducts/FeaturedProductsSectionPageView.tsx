'use client';

import { SectionVisibilityCheckbox } from '../shared/SectionVisibilityCheckbox';
import styles from './FeaturedProductsSectionPage.module.css';
import type { PrimaryFilter, SecondaryOrder } from './featured-products-section-page.types';
import type { FeaturedProductsSectionPageModel } from './hooks/useFeaturedProductsSectionPage';

type FeaturedProductsSectionPageViewProps = {
  model: FeaturedProductsSectionPageModel;
};

export function FeaturedProductsSectionPageView({ model }: FeaturedProductsSectionPageViewProps) {
  const { data, loading, saving, message, handleSave, handleChange, handleLimitChange } = model;

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
        <h1 className={styles.title}>Популярные товары</h1>
        <p className={styles.subtitle}>
          Настройки блока «Популярные товары» на главной странице. Можно выбрать, какие товары
          показывать первыми и как сортировать остальные.
        </p>
      </header>

      <SectionVisibilityCheckbox
        sectionKey="featuredProductsVisible"
        sectionLabel="Популярные товары"
      />

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
            placeholder="Популярные товары"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Подзаголовок</label>
          <input
            type="text"
            value={data.subtitle}
            onChange={(e) => handleChange('subtitle', e.target.value)}
            className={styles.input}
            placeholder="Товары, которые выбирают наши клиенты"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Показывать первыми</label>
          <select
            value={data.primaryFilter}
            onChange={(e) => handleChange('primaryFilter', e.target.value as PrimaryFilter)}
            className={styles.input}
          >
            <option value="featured">Хит (помеченные как «Хит продаж»)</option>
            <option value="new">Новинка (помеченные как «Новинка»)</option>
            <option value="featured_or_new">Хит или новинка</option>
            <option value="any">Любые (без приоритета)</option>
          </select>
        </div>
        <div className={styles.formGroup}>
          <label>Сортировка остальных товаров</label>
          <select
            value={data.secondaryOrder}
            onChange={(e) => handleChange('secondaryOrder', e.target.value as SecondaryOrder)}
            className={styles.input}
          >
            <option value="sort_order">По порядку сортировки</option>
            <option value="created_desc">По дате добавления (сначала новые)</option>
          </select>
        </div>
        <div className={styles.formGroup}>
          <label>Количество товаров (1–24)</label>
          <input
            type="number"
            min={1}
            max={24}
            value={data.limit}
            onChange={(e) => handleLimitChange(e.target.value)}
            className={styles.input}
            style={{ maxWidth: 120 }}
          />
        </div>
        <div className={styles.saveBlock}>
          <button
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
