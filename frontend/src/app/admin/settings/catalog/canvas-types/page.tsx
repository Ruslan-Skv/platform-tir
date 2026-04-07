'use client';

import Link from 'next/link';

import { CanvasTypesSettingsSection } from '@/views/admin/Settings/CanvasTypesSettingsSection';
import styles from '@/views/admin/Settings/SettingsPage.module.css';

export default function AdminCanvasTypesSettingsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Типы полотна</h1>
        <p className={styles.subtitle}>
          Справочник для поля «Тип полотна» в атрибутах категории (slug атрибута в каталоге обычно
          canvas-type). Значения в карточке товара выбираются из этого списка.
        </p>
        <p style={{ marginTop: '0.5rem' }}>
          <Link href="/admin/settings/catalog" style={{ color: '#d90652' }}>
            ← Настройки каталога
          </Link>
        </p>
      </header>
      <CanvasTypesSettingsSection />
    </div>
  );
}
