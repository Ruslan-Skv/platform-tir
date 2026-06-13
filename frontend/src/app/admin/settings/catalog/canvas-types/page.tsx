'use client';

import Link from 'next/link';

import { CanvasTypesSettingsSection } from '@/views/admin/Settings';
import styles from '@/views/admin/Settings/shared/SettingsPage.module.css';

export default function AdminCanvasTypesSettingsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Типы полотна</h1>
        <p className={styles.subtitle}>
          Справочник для поля «Тип полотна» в атрибутах категории (slug атрибута в каталоге обычно
          canvas-type). Значения в карточке товара выбираются из этого списка.
        </p>
        <p className={styles.backNav}>
          <Link href="/admin/settings/catalog" className={styles.backLink}>
            ← Настройки каталога
          </Link>
        </p>
      </header>
      <CanvasTypesSettingsSection />
    </div>
  );
}
