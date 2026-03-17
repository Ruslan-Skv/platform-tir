'use client';

import { DirectorMessageSection } from '@/views/admin/Settings/DirectorMessageSection';
import styles from '@/views/admin/Settings/SettingsPage.module.css';

export default function AdminDirectorMessagePage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Письмо директору</h1>
        <p className={styles.subtitle}>
          Настройка формы «Письмо директору»: email, на который будут приходить письма от
          пользователей сайта.
        </p>
      </header>
      <DirectorMessageSection />
    </div>
  );
}
