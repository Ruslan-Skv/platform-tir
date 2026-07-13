'use client';

import Link from 'next/link';

import pageStyles from '../shared/SettingsPage.module.css';
import hubStyles from './SettingsHubPage.module.css';

const SETTINGS_LINKS = [
  { href: '/admin/settings/product-templates', label: 'Шаблоны товаров' },
  { href: '/admin/settings/partner-products', label: 'Товары партнёра' },
  { href: '/admin/settings/reviews', label: 'Отзывы и оценки' },
  { href: '/admin/settings/catalog', label: 'Каталог' },
  { href: '/admin/settings/catalog-filters', label: 'Блок фильтров' },
  { href: '/admin/settings/catalog-hub-preview', label: 'Превью каталога (хаб)' },
  { href: '/admin/settings/notifications', label: 'Уведомления в админке' },
  { href: '/admin/settings/notification-channels', label: 'Каналы уведомлений о заявках' },
  { href: '/admin/settings/seller-legal', label: 'Информация о продавце' },
  { href: '/admin/settings/site-disclaimer', label: 'Информация на сайте (не оферта)' },
  { href: '/admin/settings/public-offers', label: 'Публичные оферты' },
  { href: '/admin/settings/checkout', label: 'Оформление заказов' },
  { href: '/admin/settings/delivery', label: 'Доставка' },
  { href: '/admin/settings/admin-link', label: 'Кнопка «Админка» на сайте' },
  { href: '/admin/settings/quote-form', label: 'Рассчитать стоимость (виды работ)' },
  { href: '/admin/settings/pwa', label: 'PWA и обновления' },
  { href: '/admin/settings/work-days', label: 'Учёт рабочего времени' },
  { href: '/admin/settings/roles', label: 'Роли пользователей' },
  { href: '/admin/users', label: 'Управление пользователями' },
] as const;

export function SettingsHubPageView() {
  return (
    <div className={pageStyles.page}>
      <header className={pageStyles.header}>
        <h1 className={pageStyles.title}>Настройки</h1>
        <p className={pageStyles.subtitle}>Управление параметрами системы. Выберите раздел:</p>
      </header>
      <nav className={hubStyles.nav}>
        {SETTINGS_LINKS.map(({ href, label }) => (
          <Link key={href} href={href} className={hubStyles.navLink}>
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
