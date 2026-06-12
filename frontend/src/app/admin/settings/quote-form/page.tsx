'use client';

import { QuoteFormSection } from '@/views/admin/Settings';
import styles from '@/views/admin/Settings/shared/SettingsPage.module.css';

export default function AdminQuoteFormPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Рассчитать стоимость</h1>
        <p className={styles.subtitle}>
          Настройка формы «Рассчитать стоимость» / «Отправить заявку»: email для получения
          уведомлений.
        </p>
      </header>
      <QuoteFormSection />
    </div>
  );
}
