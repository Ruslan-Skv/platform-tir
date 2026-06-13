'use client';

import Link from 'next/link';

import { WeatherstripSettingsSection } from '@/views/admin/Settings';
import styles from '@/views/admin/Settings/shared/SettingsPage.module.css';

export default function AdminWeatherstripsSettingsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Уплотнители</h1>
        <p className={styles.subtitle}>
          Справочник для поля «Уплотнители» в атрибутах категории (slug атрибута обычно{' '}
          <code>weatherstrip</code>). Значения в карточке товара выбираются из этого списка.
        </p>
        <p className={styles.backNav}>
          <Link href="/admin/settings/catalog" className={styles.backLink}>
            ← Настройки каталога
          </Link>
        </p>
      </header>
      <WeatherstripSettingsSection />
    </div>
  );
}
