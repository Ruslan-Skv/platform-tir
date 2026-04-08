'use client';

import Link from 'next/link';

import styles from '@/views/admin/Settings/SettingsPage.module.css';
import { WeatherstripSettingsSection } from '@/views/admin/Settings/WeatherstripSettingsSection';

export default function AdminWeatherstripsSettingsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Уплотнители</h1>
        <p className={styles.subtitle}>
          Справочник для поля «Уплотнители» в атрибутах категории (slug атрибута обычно{' '}
          <code>weatherstrip</code>). Значения в карточке товара выбираются из этого списка.
        </p>
        <p style={{ marginTop: '0.5rem' }}>
          <Link href="/admin/settings/catalog" style={{ color: '#d90652' }}>
            ← Настройки каталога
          </Link>
        </p>
      </header>
      <WeatherstripSettingsSection />
    </div>
  );
}
