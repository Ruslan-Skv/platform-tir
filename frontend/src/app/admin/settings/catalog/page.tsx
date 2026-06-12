'use client';

import { CatalogSection } from '@/views/admin/Settings';
import styles from '@/views/admin/Settings/shared/SettingsPage.module.css';

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
