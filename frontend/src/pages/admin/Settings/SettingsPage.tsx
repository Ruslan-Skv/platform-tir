'use client';

import { RolesSection } from './RolesSection';
import styles from './SettingsPage.module.css';

export function SettingsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Настройки</h1>
        <p className={styles.subtitle}>
          Управление ролями и параметрами системы. Роли заданы в базе данных (enum UserRole) и
          используются для доступа к разделам админки.
        </p>
      </header>
      <RolesSection />
    </div>
  );
}
