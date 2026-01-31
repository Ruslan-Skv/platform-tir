'use client';

import Link from 'next/link';

import styles from '@/pages/admin/Settings/SettingsPage.module.css';

export default function AdminSettingsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Настройки</h1>
        <p className={styles.subtitle}>Управление параметрами системы. Выберите раздел:</p>
      </header>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
        <Link
          href="/admin/settings/product-templates"
          className={styles.subtitle}
          style={{ color: '#4f46e5', textDecoration: 'underline' }}
        >
          Шаблоны товаров
        </Link>
        <Link
          href="/admin/settings/partner-products"
          className={styles.subtitle}
          style={{ color: '#4f46e5', textDecoration: 'underline' }}
        >
          Товары партнёра
        </Link>
        <Link
          href="/admin/settings/reviews"
          className={styles.subtitle}
          style={{ color: '#4f46e5', textDecoration: 'underline' }}
        >
          Отзывы и оценки
        </Link>
        <Link
          href="/admin/settings/notifications"
          className={styles.subtitle}
          style={{ color: '#4f46e5', textDecoration: 'underline' }}
        >
          Уведомления
        </Link>
        <Link
          href="/admin/settings/roles"
          className={styles.subtitle}
          style={{ color: '#4f46e5', textDecoration: 'underline' }}
        >
          Роли пользователей
        </Link>
        <Link
          href="/admin/users"
          className={styles.subtitle}
          style={{ color: '#4f46e5', textDecoration: 'underline' }}
        >
          Управление пользователями
        </Link>
      </nav>
    </div>
  );
}
