'use client';

import { ReviewsSection } from '@/views/admin/Settings';
import styles from '@/views/admin/Settings/shared/SettingsPage.module.css';

export default function AdminReviewsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Отзывы и оценки</h1>
        <p className={styles.subtitle}>
          Настройка функциональности отзывов на товары и модерация отзывов.
        </p>
      </header>
      <ReviewsSection />
    </div>
  );
}
