'use client';

import { ProductTemplatesSection } from '@/pages/admin/Settings/ProductTemplatesSection';
import styles from '@/pages/admin/Settings/SettingsPage.module.css';

export default function AdminProductTemplatesPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Шаблоны товаров</h1>
        <p className={styles.subtitle}>Настройка шаблонов таблиц и карточек товаров для админки.</p>
      </header>
      <ProductTemplatesSection />
    </div>
  );
}
