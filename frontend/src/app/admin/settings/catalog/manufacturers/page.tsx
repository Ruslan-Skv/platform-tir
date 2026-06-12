'use client';

import Link from 'next/link';

import { ManufacturersSettingsSection } from '@/views/admin/Settings';
import styles from '@/views/admin/Settings/shared/SettingsPage.module.css';

export default function AdminManufacturersSettingsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Производители</h1>
        <p className={styles.subtitle}>
          Справочник для поля «Производитель» в карточке товара: добавление, редактирование и
          удаление позиций.
        </p>
        <p style={{ marginTop: '0.5rem' }}>
          <Link href="/admin/settings/catalog" style={{ color: '#d90652' }}>
            ← Настройки каталога
          </Link>
        </p>
      </header>
      <ManufacturersSettingsSection />
    </div>
  );
}
