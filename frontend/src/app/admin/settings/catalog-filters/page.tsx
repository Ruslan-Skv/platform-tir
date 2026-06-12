'use client';

import { CatalogFilterBlockSection } from '@/views/admin/Settings';
import styles from '@/views/admin/Settings/shared/SettingsPage.module.css';

export default function AdminCatalogFiltersSettingsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Блок фильтров каталога</h1>
        <p className={styles.subtitle}>
          Настройка фильтров витрины: категория-якорь, распространение на подкатегории и набор
          фильтров (атрибуты категории, наличие, производитель).
        </p>
      </header>
      <CatalogFilterBlockSection />
    </div>
  );
}
