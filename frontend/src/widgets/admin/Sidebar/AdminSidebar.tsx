'use client';

import { useState } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import styles from './AdminSidebar.module.css';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: string;
  children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    label: 'Дашборд',
    href: '/admin',
    icon: '📊',
  },
  {
    label: 'CRM',
    href: '/admin/crm',
    icon: '👥',
    children: [
      { label: 'Клиенты', href: '/admin/crm/customers' },
      { label: 'Чат поддержки', href: '/admin/support' },
      { label: 'Воронка продаж', href: '/admin/crm/funnel' },
      { label: 'Сделки', href: '/admin/crm/deals' },
      { label: 'Задачи', href: '/admin/crm/tasks' },
    ],
  },
  {
    label: 'Контент',
    href: '/admin/content',
    icon: '📝',
    children: [
      { label: 'Hero-блок главной', href: '/admin/content/hero' },
      { label: 'Наши направления', href: '/admin/content/directions' },
      { label: 'Страницы', href: '/admin/content/pages' },
      { label: 'Блог', href: '/admin/content/blog' },
      { label: 'Комментарии', href: '/admin/content/comments' },
    ],
  },
  {
    label: 'Каталог',
    href: '/admin/catalog',
    icon: '📦',
    children: [
      { label: 'Товары', href: '/admin/catalog/products' },
      { label: 'Категории', href: '/admin/catalog/categories' },
      { label: 'Производители', href: '/admin/catalog/manufacturers' },
      { label: 'Характеристики', href: '/admin/catalog/attributes' },
      { label: 'Поставщики', href: '/admin/catalog/suppliers' },
    ],
  },
  {
    label: 'Заказы',
    href: '/admin/orders',
    icon: '🛒',
    children: [
      { label: 'Все заказы', href: '/admin/orders' },
      { label: 'Доставка', href: '/admin/orders/shipping' },
      { label: 'Оплаты', href: '/admin/orders/payments' },
    ],
  },
  {
    label: 'Аналитика',
    href: '/admin/analytics',
    icon: '📈',
    children: [
      { label: 'Обзор продаж', href: '/admin/analytics/sales' },
      { label: 'Финансовые отчеты', href: '/admin/analytics/financial' },
      { label: 'KPI менеджеров', href: '/admin/analytics/managers' },
      { label: 'Маркетинг', href: '/admin/analytics/marketing' },
    ],
  },
  {
    label: 'Настройки',
    href: '/admin/settings',
    icon: '⚙️',
    children: [
      { label: 'Роли', href: '/admin/settings' },
      { label: 'Управление пользователями', href: '/admin/users' },
    ],
  },
];

export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpand = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((item) => item !== href) : [...prev, href]
    );
  };

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname?.startsWith(href) ?? false;
  };

  const isChildActive = (item: NavItem) => {
    if (!item.children) return false;
    return item.children.some((child) => pathname === child.href);
  };

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.header}>
        <Link href="/admin" className={styles.logo}>
          {collapsed ? 'T' : 'ТИР Админ'}
        </Link>
        <button className={styles.toggleBtn} onClick={onToggle}>
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => (
          <div key={item.href} className={styles.navItem}>
            {item.children ? (
              <>
                <button
                  className={`${styles.navLink} ${
                    isActive(item.href) || isChildActive(item) ? styles.active : ''
                  }`}
                  onClick={() => toggleExpand(item.href)}
                >
                  <span className={styles.icon}>{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className={styles.label}>{item.label}</span>
                      <span
                        className={`${styles.arrow} ${
                          expandedItems.includes(item.href) ? styles.expanded : ''
                        }`}
                      >
                        ▼
                      </span>
                    </>
                  )}
                </button>
                {!collapsed && expandedItems.includes(item.href) && (
                  <div className={styles.submenu}>
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`${styles.submenuLink} ${
                          pathname === child.href ? styles.active : ''
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link
                href={item.href}
                className={`${styles.navLink} ${isActive(item.href) ? styles.active : ''}`}
              >
                <span className={styles.icon}>{item.icon}</span>
                {!collapsed && <span className={styles.label}>{item.label}</span>}
              </Link>
            )}
          </div>
        ))}
      </nav>

      <div className={styles.footer}>
        <Link href="/" className={styles.backLink}>
          {collapsed ? '🏠' : '← На сайт'}
        </Link>
      </div>
    </aside>
  );
}
