'use client';

import { MeasurementFormSection } from '@/views/admin/Settings';
import styles from '@/views/admin/Settings/shared/SettingsPage.module.css';

export default function AdminMeasurementFormPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Записаться на замер</h1>
        <p className={styles.subtitle}>
          Настройка формы «Записаться на замер»: email для получения уведомлений о новых заявках.
        </p>
      </header>
      <MeasurementFormSection />
    </div>
  );
}
