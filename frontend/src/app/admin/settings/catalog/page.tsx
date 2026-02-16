'use client';

import { CatalogSection } from '@/pages/admin/Settings/CatalogSection';
import styles from '@/pages/admin/Settings/SettingsPage.module.css';

export default function AdminCatalogSettingsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Настройки каталога</h1>
        <p className={styles.subtitle}>
          Режим просмотра карточек товаров на мобильных устройствах по умолчанию.
        </p>
      </header>
      <CatalogSection />
    </div>
  );
}
