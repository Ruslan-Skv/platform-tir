'use client';

import { UserCabinetSection } from '@/views/admin/Settings';
import styles from '@/views/admin/Settings/shared/SettingsPage.module.css';

export default function AdminUserCabinetPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Личный кабинет пользователя</h1>
        <p className={styles.subtitle}>
          Настройка разделов личного кабинета и управление данными пользователей.
        </p>
      </header>
      <UserCabinetSection />
    </div>
  );
}
