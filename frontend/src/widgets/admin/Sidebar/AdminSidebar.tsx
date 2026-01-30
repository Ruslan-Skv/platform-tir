'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import styles from './AdminSidebar.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavChild {
  label: string;
  href: string;
  children?: NavChild[];
}

interface NavItem {
  label: string;
  href: string;
  icon: string;
  children?: NavChild[];
}

interface CategoryTree {
  id: string;
  name: string;
  slug: string;
  children?: CategoryTree[];
}

const baseNavItems: NavItem[] = [
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
      {
        label: 'Главная страница',
        href: '/admin/content/home',
        children: [
          { label: 'Первый блок', href: '/admin/content/hero' },
          { label: 'Наши направления', href: '/admin/content/directions' },
          { label: 'Почему выбирают нас', href: '/admin/content/advantages' },
          { label: 'Комплексные решения', href: '/admin/content/services' },
          { label: 'Популярные товары', href: '/admin/content/featured-products' },
        ],
      },
      { label: 'Страницы', href: '/admin/content/pages' },
      { label: 'Блог', href: '/admin/content/blog' },
      { label: 'Комментарии', href: '/admin/content/comments' },
      { label: 'Футер', href: '/admin/content/footer' },
    ],
  },
  {
    label: 'Каталог',
    href: '/admin/catalog',
    icon: '📦',
    children: [
      // Товары с древовидной структурой по категориям — заполняется динамически
      {
        label: 'Товары',
        href: '/admin/catalog/products',
        children: [{ label: 'Все товары', href: '/admin/catalog/products' }],
      },
      { label: 'Категории', href: '/admin/catalog/categories' },
      { label: 'Характеристики', href: '/admin/catalog/attributes' },
    ],
  },
  {
    label: 'Партнёры',
    href: '/admin/partners',
    icon: '🤝',
  },
  {
    label: 'Поставщики',
    href: '/admin/catalog/suppliers',
    icon: '🚚',
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
      { label: 'Шаблоны товаров', href: '/admin/settings/product-templates' },
      { label: 'Товары партнёра', href: '/admin/settings/partner-products' },
      { label: 'Роли', href: '/admin/settings/roles' },
      { label: 'Управление пользователями', href: '/admin/users' },
    ],
  },
];

function categoryToNavChild(cat: CategoryTree): NavChild {
  const hasChildren = cat.children && cat.children.length > 0;
  return {
    label: cat.name,
    href: `/admin/catalog/products/category/${cat.id}`,
    children: hasChildren ? cat.children!.map(categoryToNavChild) : undefined,
  };
}

export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [categories, setCategories] = useState<CategoryTree[]>([]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/categories`);
      if (response.ok) {
        const data: CategoryTree[] = await response.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories for sidebar:', err);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const navItems = useMemo(() => {
    const catalogItem = baseNavItems.find((item) => item.href === '/admin/catalog');
    if (!catalogItem?.children) return baseNavItems;

    const categoryNavChildren: NavChild[] = categories.flatMap(categoryToNavChild);
    const productsChildren: NavChild[] = [
      { label: 'Все товары', href: '/admin/catalog/products' },
      ...categoryNavChildren,
    ];

    return baseNavItems.map((item) => {
      if (item.href !== '/admin/catalog') return item;
      return {
        ...item,
        children: catalogItem.children!.map((child) =>
          child.label === 'Товары' ? { ...child, children: productsChildren } : child
        ),
      };
    });
  }, [categories]);

  // Найти путь (предки + сам ключ) для раскрытия при клике
  const getExpandBranch = useCallback(
    (key: string): string[] => {
      for (const item of navItems) {
        if (item.href === key) return [key];
        if (item.children) {
          for (const child of item.children) {
            if (child.href === key) return [item.href, key];
            if (child.children) {
              for (const nested of child.children) {
                if (nested.href === key) return [item.href, child.href, key];
              }
            }
          }
        }
      }
      return [key];
    },
    [navItems]
  );

  const toggleExpand = (key: string) => {
    setExpandedItems((prev) => {
      const isExpanding = !prev.includes(key);
      if (isExpanding) {
        // Раскрываем только эту ветку, остальные сворачиваем
        return getExpandBranch(key);
      }
      return prev.filter((item) => item !== key);
    });
  };

  const isNestedExpanded = (child: NavChild) => expandedItems.includes(child.href);

  // При навигации раскрываем только активную ветку (accordion)
  useEffect(() => {
    const toExpand: string[] = [];
    navItems.forEach((item) => {
      if (item.children && (isActive(item.href) || isChildActive(item.children))) {
        toExpand.push(item.href);
        item.children.forEach((child) => {
          if (child.children && isChildOrDescendantActive(child)) {
            toExpand.push(child.href);
          }
        });
      }
    });
    setExpandedItems(toExpand);
  }, [pathname, navItems]);

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname?.startsWith(href) ?? false;
  };

  const isChildActive = (children: NavChild[] | undefined): boolean => {
    if (!children) return false;
    return children.some(
      (child) => pathname === child.href || (child.children ? isChildActive(child.children) : false)
    );
  };

  const isChildOrDescendantActive = (child: NavChild): boolean =>
    pathname === child.href || (child.children ? isChildActive(child.children) : false);

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
                    isActive(item.href) || isChildActive(item.children) ? styles.active : ''
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
                    {item.children.map((child) =>
                      child.children ? (
                        <div key={child.label} className={styles.submenuGroup}>
                          <button
                            type="button"
                            className={`${styles.submenuGroupRow} ${
                              isChildOrDescendantActive(child) ? styles.active : ''
                            }`}
                            onClick={() => toggleExpand(child.href)}
                            aria-expanded={isNestedExpanded(child)}
                            aria-label={`${child.label}, ${isNestedExpanded(child) ? 'свернуть' : 'развернуть'}`}
                          >
                            <span className={styles.submenuGroupLink}>{child.label}</span>
                            <span
                              className={`${styles.arrow} ${
                                isNestedExpanded(child) ? styles.expanded : ''
                              }`}
                            >
                              ▼
                            </span>
                          </button>
                          {isNestedExpanded(child) && (
                            <div className={styles.submenuNested}>
                              {child.children.map((nested) => (
                                <Link
                                  key={nested.href}
                                  href={nested.href}
                                  className={`${styles.submenuLink} ${
                                    pathname === nested.href ? styles.active : ''
                                  }`}
                                >
                                  {nested.label}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Link
                          key={child.label}
                          href={child.href}
                          className={`${styles.submenuLink} ${
                            pathname === child.href ? styles.active : ''
                          }`}
                        >
                          {child.label}
                        </Link>
                      )
                    )}
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
