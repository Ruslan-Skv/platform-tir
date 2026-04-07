'use client';

import Link from 'next/link';

import { CoatingMaterialsSettingsSection } from '@/views/admin/Settings/CoatingMaterialsSettingsSection';
import styles from '@/views/admin/Settings/SettingsPage.module.css';

export default function AdminCoatingMaterialsSettingsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Материалы покрытия</h1>
        <p className={styles.subtitle}>
          Справочник для поля «Материал покрытия» в атрибутах категории (slug атрибута:{' '}
          <code>coating-material</code>). Добавление, редактирование и удаление позиций.
        </p>
        <p style={{ marginTop: '0.5rem' }}>
          <Link href="/admin/settings/catalog" style={{ color: '#d90652' }}>
            ← Настройки каталога
          </Link>
        </p>
      </header>
      <CoatingMaterialsSettingsSection />
    </div>
  );
}
