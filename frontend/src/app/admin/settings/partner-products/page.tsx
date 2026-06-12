'use client';

import { PartnerProductsSection } from '@/views/admin/Settings';
import styles from '@/views/admin/Settings/shared/SettingsPage.module.css';

export default function AdminPartnerProductsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Товары партнёра</h1>
        <p className={styles.subtitle}>
          Настройки отображения товаров партнёра на карточках в публичной части.
        </p>
      </header>
      <PartnerProductsSection />
    </div>
  );
}
