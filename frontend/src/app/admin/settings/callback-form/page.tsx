'use client';

import { CallbackFormSection } from '@/views/admin/Settings/CallbackFormSection';
import styles from '@/views/admin/Settings/SettingsPage.module.css';

export default function AdminCallbackFormPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Заказать звонок</h1>
        <p className={styles.subtitle}>
          Настройка формы «Заказать звонок»: email для получения уведомлений о новых заявках.
        </p>
      </header>
      <CallbackFormSection />
    </div>
  );
}
