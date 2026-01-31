'use client';

import { ReviewsSection } from '@/pages/admin/Settings/ReviewsSection';
import styles from '@/pages/admin/Settings/SettingsPage.module.css';

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
