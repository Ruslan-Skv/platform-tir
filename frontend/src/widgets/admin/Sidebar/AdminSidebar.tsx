'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import { useAuth } from '@/features/auth';

import { AccessModal } from './AccessModal';
import styles from './AdminSidebar.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  width: number;
  onWidthChange: (width: number) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
}

interface NavChild {
  label: string;
  href: string;
  resourceId?: string;
  children?: NavChild[];
}

interface NavItem {
  label: string;
  href: string;
  icon: string;
  resourceId?: string;
  children?: NavChild[];
}

interface CategoryTree {
  id: string;
  name: string;
  slug: string;
  children?: CategoryTree[];
}

const baseNavItems: NavItem[] = [
  { label: 'Дашборд', href: '/admin', icon: '📊', resourceId: 'admin' },
  {
    label: 'CRM',
    href: '/admin/crm',
    icon: '👥',
    resourceId: 'admin.crm',
    children: [
      { label: 'Замеры', href: '/admin/crm/measurements', resourceId: 'admin.crm.measurements' },
      { label: 'Объекты', href: '/admin/crm/contracts', resourceId: 'admin.crm.contracts' },
      {
        label: 'Движ. ден. средст',
        href: '/admin/crm/contract-payments',
        resourceId: 'admin.crm.contract-payments',
      },
      { label: 'Касса', href: '/admin/crm/cash-register', resourceId: 'admin.crm.cash-register' },
      { label: 'Офисы', href: '/admin/crm/offices', resourceId: 'admin.crm.offices' },
      { label: 'Менеджеры', href: '/admin/crm/managers', resourceId: 'admin.crm.managers' },
      { label: 'Клиенты', href: '/admin/crm/customers', resourceId: 'admin.crm.customers' },
      { label: 'Заявки с форм', href: '/admin/forms', resourceId: 'admin.forms' },
      { label: 'Чат поддержки', href: '/admin/support', resourceId: 'admin.support' },
      { label: 'Воронка продаж', href: '/admin/crm/funnel', resourceId: 'admin.crm.funnel' },
      { label: 'Задачи', href: '/admin/crm/tasks', resourceId: 'admin.crm.tasks' },
      {
        label: 'Расчёт з/п',
        href: '/admin/crm/payroll',
        resourceId: 'admin.crm.payroll',
        children: [
          {
            label: 'Управление',
            href: '/admin/crm/payroll/management',
            resourceId: 'admin.crm.payroll.management',
          },
        ],
      },
    ],
  },
  {
    label: 'Контент',
    href: '/admin/content',
    icon: '📝',
    resourceId: 'admin.content',
    children: [
      {
        label: 'Главная страница',
        href: '/admin/content/home',
        resourceId: 'admin.content.home',
        children: [
          { label: 'Обзор', href: '/admin/content/home', resourceId: 'admin.content.home' },
          { label: 'Первый блок', href: '/admin/content/hero', resourceId: 'admin.content.hero' },
          {
            label: 'Наши направления',
            href: '/admin/content/directions',
            resourceId: 'admin.content.directions',
          },
          {
            label: 'Почему выбирают нас',
            href: '/admin/content/advantages',
            resourceId: 'admin.content.advantages',
          },
          {
            label: 'Комплексные решения',
            href: '/admin/content/services',
            resourceId: 'admin.content.services',
          },
          {
            label: 'Популярные товары',
            href: '/admin/content/featured-products',
            resourceId: 'admin.content.featured-products',
          },
          {
            label: 'Контактная форма',
            href: '/admin/content/contact-form',
            resourceId: 'admin.content.contact-form',
          },
        ],
      },
      { label: 'Страницы', href: '/admin/content/pages', resourceId: 'admin.content.pages' },
      { label: 'Блог', href: '/admin/content/blog', resourceId: 'admin.content.blog' },
      { label: 'Акции', href: '/admin/content/promotions', resourceId: 'admin.content.promotions' },
      { label: 'Фото', href: '/admin/content/photo', resourceId: 'admin.content.photo' },
      {
        label: 'Комментарии',
        href: '/admin/content/comments',
        resourceId: 'admin.content.comments',
      },
      {
        label: 'Меню навигации',
        href: '/admin/content/navigation',
        resourceId: 'admin.content.navigation',
      },
      { label: 'Футер', href: '/admin/content/footer', resourceId: 'admin.content.footer' },
    ],
  },
  {
    label: 'Каталог',
    href: '/admin/catalog',
    icon: '📦',
    resourceId: 'admin.catalog',
    children: [
      {
        label: 'Товары',
        href: '/admin/catalog/products',
        resourceId: 'admin.catalog.products',
        children: [
          {
            label: 'Все товары',
            href: '/admin/catalog/products',
            resourceId: 'admin.catalog.products',
          },
        ],
      },
      {
        label: 'Категории',
        href: '/admin/catalog/categories',
        resourceId: 'admin.catalog.categories',
      },
      {
        label: 'Характеристики',
        href: '/admin/catalog/attributes',
        resourceId: 'admin.catalog.attributes',
      },
    ],
  },
  { label: 'Партнёры', href: '/admin/partners', icon: '🤝', resourceId: 'admin.partners' },
  {
    label: 'Поставщики',
    href: '/admin/catalog/suppliers',
    icon: '🚚',
    resourceId: 'admin.catalog.suppliers',
  },
  {
    label: 'Заказы',
    href: '/admin/orders',
    icon: '🛒',
    resourceId: 'admin.orders',
    children: [
      { label: 'Все заказы', href: '/admin/orders', resourceId: 'admin.orders' },
      { label: 'Доставка', href: '/admin/orders/shipping', resourceId: 'admin.orders.shipping' },
      { label: 'Оплаты', href: '/admin/orders/payments', resourceId: 'admin.orders.payments' },
    ],
  },
  {
    label: 'Аналитика',
    href: '/admin/analytics',
    icon: '📈',
    resourceId: 'admin.analytics',
    children: [
      {
        label: 'Обзор продаж',
        href: '/admin/analytics/sales',
        resourceId: 'admin.analytics.sales',
      },
      {
        label: 'Финансовые отчеты',
        href: '/admin/analytics/financial',
        resourceId: 'admin.analytics.financial',
      },
      {
        label: 'KPI менеджеров',
        href: '/admin/analytics/managers',
        resourceId: 'admin.analytics.managers',
      },
      {
        label: 'Маркетинг',
        href: '/admin/analytics/marketing',
        resourceId: 'admin.analytics.marketing',
      },
    ],
  },
  {
    label: 'Настройки',
    href: '/admin/settings',
    icon: '⚙️',
    resourceId: 'admin.settings',
    children: [
      {
        label: 'Шаблоны товаров',
        href: '/admin/settings/product-templates',
        resourceId: 'admin.settings.product-templates',
      },
      {
        label: 'Товары партнёра',
        href: '/admin/settings/partner-products',
        resourceId: 'admin.settings.partner-products',
      },
      {
        label: 'Отзывы и оценки',
        href: '/admin/settings/reviews',
        resourceId: 'admin.settings.reviews',
      },
      {
        label: 'Личный кабинет',
        href: '/admin/settings/user-cabinet',
        resourceId: 'admin.settings.user-cabinet',
      },
      {
        label: 'Уведомления',
        href: '/admin/settings/notifications',
        resourceId: 'admin.settings.notifications',
      },
      { label: 'Роли', href: '/admin/settings/roles', resourceId: 'admin.settings.roles' },
      { label: 'Управление пользователями', href: '/admin/users', resourceId: 'admin.users' },
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

export function AdminSidebar({
  collapsed,
  onToggle,
  width,
  onWidthChange,
  onResizeStart,
  onResizeEnd,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [categories, setCategories] = useState<CategoryTree[]>([]);
  const [isResizing, setIsResizing] = useState(false);
  const [accessModal, setAccessModal] = useState<{ resourceId: string; label: string } | null>(
    null
  );
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      onResizeStart?.();
      resizeStartX.current = e.clientX;
      resizeStartWidth.current = width;
      const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - resizeStartX.current;
        onWidthChange(resizeStartWidth.current + delta);
      };
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        setIsResizing(false);
        onResizeEnd?.();
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    },
    [width, onWidthChange, onResizeStart, onResizeEnd]
  );

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

  const fromCategory = searchParams.get('fromCategory');
  const isProductEditPage = pathname?.match(/^\/admin\/catalog\/products\/[^/]+\/edit/);

  const isPathActive = (href: string) => {
    if (isProductEditPage && fromCategory) {
      const categoryHref = `/admin/catalog/products/category/${fromCategory}`;
      return href === categoryHref;
    }
    return pathname === href || (pathname?.startsWith(href + '/') ?? false);
  };

  const isChildActive = (children: NavChild[] | undefined): boolean => {
    if (!children) return false;
    return children.some(
      (child) =>
        isPathActive(child.href) || (child.children ? isChildActive(child.children) : false)
    );
  };

  const isChildOrDescendantActive = (child: NavChild): boolean =>
    isPathActive(child.href) || (child.children ? isChildActive(child.children) : false);

  return (
    <aside
      className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${isResizing ? styles.resizing : ''}`}
      style={{ width: collapsed ? undefined : width }}
    >
      {!collapsed && (
        <div
          className={styles.resizer}
          onMouseDown={handleResizeStart}
          role="separator"
          aria-orientation="vertical"
          aria-label="Изменить ширину сайдбара"
        />
      )}
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
                <div className={styles.navLinkRow}>
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
                  {!collapsed && isSuperAdmin && item.resourceId && (
                    <button
                      type="button"
                      className={styles.accessIcon}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setAccessModal({ resourceId: item.resourceId!, label: item.label });
                      }}
                      title="Доступ"
                      aria-label={`Управление доступом: ${item.label}`}
                    >
                      🛡️
                    </button>
                  )}
                </div>
                {!collapsed && expandedItems.includes(item.href) && (
                  <div className={styles.submenu}>
                    {item.children.map((child) =>
                      child.children ? (
                        <div key={child.label} className={styles.submenuGroup}>
                          <div className={styles.submenuGroupRowWrap}>
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
                            {isSuperAdmin && child.resourceId && (
                              <button
                                type="button"
                                className={styles.accessIconSubmenu}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setAccessModal({
                                    resourceId: child.resourceId!,
                                    label: child.label,
                                  });
                                }}
                                title="Доступ"
                                aria-label={`Управление доступом: ${child.label}`}
                              >
                                🛡️
                              </button>
                            )}
                          </div>
                          {isNestedExpanded(child) && (
                            <div className={styles.submenuNested}>
                              {child.children.map((nested) => (
                                <div key={nested.href} className={styles.submenuLinkRow}>
                                  <Link
                                    href={nested.href}
                                    className={`${styles.submenuLink} ${
                                      isPathActive(nested.href) ? styles.active : ''
                                    }`}
                                  >
                                    {nested.label}
                                  </Link>
                                  {isSuperAdmin && nested.resourceId && (
                                    <button
                                      type="button"
                                      className={styles.accessIconSubmenu}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setAccessModal({
                                          resourceId: nested.resourceId!,
                                          label: nested.label,
                                        });
                                      }}
                                      title="Доступ"
                                      aria-label={`Управление доступом: ${nested.label}`}
                                    >
                                      🛡️
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div key={child.label} className={styles.submenuLinkRow}>
                          <Link
                            href={child.href}
                            className={`${styles.submenuLink} ${
                              isPathActive(child.href) ? styles.active : ''
                            }`}
                          >
                            {child.label}
                          </Link>
                          {isSuperAdmin && child.resourceId && (
                            <button
                              type="button"
                              className={styles.accessIconSubmenu}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setAccessModal({
                                  resourceId: child.resourceId!,
                                  label: child.label,
                                });
                              }}
                              title="Доступ"
                              aria-label={`Управление доступом: ${child.label}`}
                            >
                              🛡️
                            </button>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className={styles.navLinkRow}>
                <Link
                  href={item.href}
                  className={`${styles.navLink} ${isActive(item.href) ? styles.active : ''}`}
                >
                  <span className={styles.icon}>{item.icon}</span>
                  {!collapsed && <span className={styles.label}>{item.label}</span>}
                </Link>
                {!collapsed && isSuperAdmin && item.resourceId && (
                  <button
                    type="button"
                    className={styles.accessIcon}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setAccessModal({ resourceId: item.resourceId!, label: item.label });
                    }}
                    title="Доступ"
                    aria-label={`Управление доступом: ${item.label}`}
                  >
                    🛡️
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </nav>

      {accessModal && (
        <AccessModal
          resourceId={accessModal.resourceId}
          label={accessModal.label}
          onClose={() => setAccessModal(null)}
        />
      )}

      <div className={styles.footer}>
        <Link href="/" className={styles.backLink}>
          {collapsed ? '🏠' : '← На сайт'}
        </Link>
      </div>
    </aside>
  );
}
