'use client';

import Link from 'next/link';

import styles from '@/views/admin/Settings/shared/SettingsPage.module.css';

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
          href="/admin/settings/catalog"
          className={styles.subtitle}
          style={{ color: '#4f46e5', textDecoration: 'underline' }}
        >
          Каталог
        </Link>
        <Link
          href="/admin/settings/catalog-filters"
          className={styles.subtitle}
          style={{ color: '#4f46e5', textDecoration: 'underline' }}
        >
          Блок фильтров
        </Link>
        <Link
          href="/admin/settings/catalog-hub-preview"
          className={styles.subtitle}
          style={{ color: '#4f46e5', textDecoration: 'underline' }}
        >
          Превью каталога (хаб)
        </Link>
        <Link
          href="/admin/settings/notifications"
          className={styles.subtitle}
          style={{ color: '#4f46e5', textDecoration: 'underline' }}
        >
          Уведомления
        </Link>
        <Link
          href="/admin/settings/checkout"
          className={styles.subtitle}
          style={{ color: '#4f46e5', textDecoration: 'underline' }}
        >
          Оформление заказов
        </Link>
        <Link
          href="/admin/settings/delivery"
          className={styles.subtitle}
          style={{ color: '#4f46e5', textDecoration: 'underline' }}
        >
          Доставка
        </Link>
        <Link
          href="/admin/settings/admin-link"
          className={styles.subtitle}
          style={{ color: '#4f46e5', textDecoration: 'underline' }}
        >
          Кнопка «Админка» на сайте
        </Link>
        <Link
          href="/admin/settings/director-message"
          className={styles.subtitle}
          style={{ color: '#4f46e5', textDecoration: 'underline' }}
        >
          Письмо директору
        </Link>
        <Link
          href="/admin/settings/measurement-form"
          className={styles.subtitle}
          style={{ color: '#4f46e5', textDecoration: 'underline' }}
        >
          Записаться на замер
        </Link>
        <Link
          href="/admin/settings/callback-form"
          className={styles.subtitle}
          style={{ color: '#4f46e5', textDecoration: 'underline' }}
        >
          Заказать звонок
        </Link>
        <Link
          href="/admin/settings/quote-form"
          className={styles.subtitle}
          style={{ color: '#4f46e5', textDecoration: 'underline' }}
        >
          Рассчитать стоимость
        </Link>
        <Link
          href="/admin/settings/pwa"
          className={styles.subtitle}
          style={{ color: '#4f46e5', textDecoration: 'underline' }}
        >
          PWA и обновления
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
