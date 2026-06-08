'use client';

import { CatalogHubPreviewSection } from '@/views/admin/Settings/CatalogHubPreviewSection';
import styles from '@/views/admin/Settings/SettingsPage.module.css';

export default function AdminCatalogHubPreviewSettingsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Превью каталога</h1>
        <p className={styles.subtitle}>
          Разделы на странице /catalog/products: выбор категорий (до 4), ручной подбор товаров для
          режимов «Популярное» и «Новинки». Если подбор не задан — товары подбираются автоматически.
        </p>
      </header>
      <CatalogHubPreviewSection />
    </div>
  );
}
