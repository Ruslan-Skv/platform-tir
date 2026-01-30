'use client';

import { RolesSection } from '@/pages/admin/Settings/RolesSection';
import styles from '@/pages/admin/Settings/SettingsPage.module.css';

export default function AdminRolesPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Роли пользователей</h1>
        <p className={styles.subtitle}>
          Роли заданы в базе данных (enum UserRole) и используются для доступа к разделам админки.
        </p>
      </header>
      <RolesSection />
    </div>
  );
}
