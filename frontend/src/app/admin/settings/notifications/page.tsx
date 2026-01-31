'use client';

import { NotificationsSection } from '@/pages/admin/Settings/NotificationsSection';
import styles from '@/pages/admin/Settings/SettingsPage.module.css';

export default function AdminNotificationsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Уведомления</h1>
        <p className={styles.subtitle}>
          Настройка звуковых и браузерных уведомлений при появлении новых отзывов.
        </p>
      </header>
      <NotificationsSection />
    </div>
  );
}
