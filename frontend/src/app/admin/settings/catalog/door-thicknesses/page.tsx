'use client';

import Link from 'next/link';

import { DoorThicknessSettingsSection } from '@/views/admin/Settings';
import styles from '@/views/admin/Settings/shared/SettingsPage.module.css';

export default function AdminDoorThicknessesSettingsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Толщина двери</h1>
        <p className={styles.subtitle}>
          Справочник для поля «Толщина двери» в атрибутах категории (slug атрибута обычно{' '}
          <code>door-thickness</code>). Значения в карточке товара выбираются из этого списка.
        </p>
        <p className={styles.backNav}>
          <Link href="/admin/settings/catalog" className={styles.backLink}>
            ← Настройки каталога
          </Link>
        </p>
      </header>
      <DoorThicknessSettingsSection />
    </div>
  );
}
