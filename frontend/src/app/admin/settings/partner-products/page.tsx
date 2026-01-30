'use client';

import { PartnerProductsSection } from '@/pages/admin/Settings/PartnerProductsSection';
import styles from '@/pages/admin/Settings/SettingsPage.module.css';

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
