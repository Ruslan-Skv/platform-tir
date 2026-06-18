'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import { useAdminAccessibleResources } from '@/features/admin/contexts/AdminAccessibleResourcesContext';
import { useAuth } from '@/features/auth';
import { getSafeHref } from '@/shared/lib/sanitize';
import { AdminPlatformBrand } from '@/shared/ui/AdminPlatformBrand';
import { AdminAccessIcon } from '@/shared/ui/icons/AdminAccessIcon';

import { AccessModal } from './AccessModal';
import styles from './AdminSidebar.module.css';

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

/** Все href подраздела (плоские + вложенные) — для выбора самого длинного совпадения с pathname */
function collectAllNavHrefs(children: NavChild[]): string[] {
  const out: string[] = [];
  for (const c of children) {
    out.push(c.href);
    if (c.children) {
      for (const n of c.children) {
        out.push(n.href);
      }
    }
  }
  return out;
}

/**
 * Страница относится к отдельному пункту верхнего уровня (напр. «Договора»), а не к hub-префиксу в настройках.
 */
function isShadowedByTopLevelNavPath(
  pathname: string,
  href: string,
  topLevelOnlyHrefs: string[]
): boolean {
  for (const top of topLevelOnlyHrefs) {
    if (top === href) continue;
    const onTop = pathname === top || pathname.startsWith(`${top}/`);
    if (!onTop) continue;
    if (top.startsWith(`${href}/`)) return true;
  }
  return false;
}

/**
 * Из кандидатов выбирается самый длинный href, для которого pathname === href или pathname.startsWith(href + '/').
 * Так «…/settings/catalog» не подсвечивается на странице «…/settings/catalog/product-badges».
 */
function getBestMatchingHref(
  pathname: string | null | undefined,
  candidates: string[],
  topLevelOnlyHrefs: string[] = []
): string | null {
  if (!pathname) return null;
  let best: string | null = null;
  for (const href of candidates) {
    const match = pathname === href || pathname.startsWith(`${href}/`);
    if (!match) continue;
    if (
      topLevelOnlyHrefs.length > 0 &&
      isShadowedByTopLevelNavPath(pathname, href, topLevelOnlyHrefs)
    ) {
      continue;
    }
    if (!best || href.length > best.length) {
      best = href;
    }
  }
  return best;
}

const baseNavItems: NavItem[] = [
  { label: 'Дашборд', href: '/admin', icon: '📊', resourceId: 'admin' },
  {
    label: 'CRM',
    href: '/admin/crm',
    icon: '👥',
    resourceId: 'admin.crm',
    children: [
      {
        label: 'Движ. ден. средст',
        href: '/admin/crm/contract-payments',
        resourceId: 'admin.crm.contract-payments',
      },
      { label: 'Касса', href: '/admin/crm/cash-register', resourceId: 'admin.crm.cash-register' },
      {
        label: 'Расчёты с поставщиками',
        href: '/admin/crm/supplier-settlements',
        resourceId: 'admin.crm.supplier-settlements',
      },
      { label: 'Офисы', href: '/admin/crm/offices', resourceId: 'admin.crm.offices' },
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
    label: 'Мастера (монтажники)',
    href: '/admin/crm/installers',
    icon: '🛠️',
    resourceId: 'admin.crm.installers',
  },
  {
    label: 'Бухгалтерия',
    href: '/admin/accounting/invoices',
    icon: '🧾',
    resourceId: 'admin.accounting',
    children: [
      {
        label: 'Счета на оплату',
        href: '/admin/accounting/invoices',
        resourceId: 'admin.accounting.invoices',
      },
    ],
  },
  {
    label: 'Договора',
    href: '/admin/contract-documents/contracts',
    icon: '📋',
    resourceId: 'admin.contract-documents.repair',
  },
  {
    label: 'Расчёты',
    href: '/admin/contract-documents/estimates',
    icon: '📊',
    resourceId: 'admin.contract-documents.estimates',
  },
  {
    label: 'Замеры',
    href: '/admin/measurements',
    icon: '📏',
    resourceId: 'admin.crm.measurements',
  },
  {
    label: 'Заказчики',
    href: '/admin/customers',
    icon: '👤',
    resourceId: 'admin.crm.customers',
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
      { label: 'Страницы', href: '/admin/content/home', resourceId: 'admin.content.home' },
      {
        label: 'Полезные статьи',
        href: '/admin/content/blog',
        resourceId: 'admin.content.blog',
      },
      { label: 'Акции', href: '/admin/content/promotions', resourceId: 'admin.content.promotions' },
      { label: 'Наши работы', href: '/admin/content/photo', resourceId: 'admin.content.photo' },
      {
        label: 'Отзывы',
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
    label: 'Квизы',
    href: '/admin/quiz/mebel',
    icon: '🎯',
    resourceId: 'admin.quiz',
    children: [{ label: 'Мебель', href: '/admin/quiz/mebel', resourceId: 'admin.quiz.mebel' }],
  },
  {
    label: 'Каталог',
    href: '/admin/catalog',
    icon: '📦',
    resourceId: 'admin.catalog',
    children: [
      { label: 'Товары', href: '/admin/catalog/products', resourceId: 'admin.catalog.products' },
      {
        label: 'Категории',
        href: '/admin/catalog/categories',
        resourceId: 'admin.catalog.categories',
      },
    ],
  },
  {
    label: 'Ремонт квартир',
    href: '/admin/service-catalog',
    icon: '🔧',
    resourceId: 'admin.service-catalog',
    children: [
      {
        label: 'Категории',
        href: '/admin/service-catalog',
        resourceId: 'admin.service-catalog',
      },
      {
        label: 'Виды работ',
        href: '/admin/service-catalog/items',
        resourceId: 'admin.service-catalog.items',
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
      {
        label: 'Порядок оформления',
        href: '/admin/orders/checkout-info',
        resourceId: 'admin.orders.checkout-info',
      },
      { label: 'Доставка', href: '/admin/orders/shipping', resourceId: 'admin.orders.shipping' },
      { label: 'Оплаты', href: '/admin/orders/payments', resourceId: 'admin.orders.payments' },
    ],
  },
  {
    label: 'Территория знаний',
    href: '/admin/knowledge',
    icon: '📚',
    resourceId: 'admin.knowledge',
  },
  {
    label: 'Подбор менеджеров',
    href: '/admin/recruitment',
    icon: '👔',
    resourceId: 'admin.recruitment',
    children: [
      {
        label: 'Кандидаты',
        href: '/admin/recruitment',
        resourceId: 'admin.recruitment',
      },
      {
        label: 'Аналитика',
        href: '/admin/recruitment/analytics',
        resourceId: 'admin.recruitment.analytics',
      },
      {
        label: 'Бланк анкеты',
        href: '/admin/recruitment/blank',
        resourceId: 'admin.recruitment',
      },
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
        label: 'Каталог',
        href: '/admin/settings/catalog',
        resourceId: 'admin.settings.catalog',
      },
      {
        label: 'Бэйджи карточек',
        href: '/admin/settings/catalog/product-badges',
        resourceId: 'admin.settings.catalog-badges',
      },
      {
        label: 'Выпадающие списки',
        href: '/admin/settings/dropdown-lists',
        resourceId: 'admin.settings.catalog-dropdown-lists',
        children: [
          {
            label: 'Производители',
            href: '/admin/settings/catalog/manufacturers',
            resourceId: 'admin.settings.catalog-manufacturers',
          },
          {
            label: 'Материалы покрытия',
            href: '/admin/settings/catalog/coating-materials',
            resourceId: 'admin.settings.catalog-coating-materials',
          },
          {
            label: 'Типы полотна',
            href: '/admin/settings/catalog/canvas-types',
            resourceId: 'admin.settings.catalog-canvas-types',
          },
          {
            label: 'Толщина двери',
            href: '/admin/settings/catalog/door-thicknesses',
            resourceId: 'admin.settings.catalog-door-thicknesses',
          },
          {
            label: 'Уплотнители',
            href: '/admin/settings/catalog/weatherstrips',
            resourceId: 'admin.settings.catalog-weatherstrips',
          },
        ],
      },
      {
        label: 'Блок фильтров',
        href: '/admin/settings/catalog-filters',
        resourceId: 'admin.settings.catalog-filters',
      },
      {
        label: 'Превью каталога',
        href: '/admin/settings/catalog-hub-preview',
        resourceId: 'admin.settings.catalog-hub-preview',
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
      {
        label: 'Оформление заказов',
        href: '/admin/settings/checkout',
        resourceId: 'admin.settings.checkout',
      },
      {
        label: 'Доставка',
        href: '/admin/settings/delivery',
        resourceId: 'admin.settings.delivery',
      },
      {
        label: 'Кнопка «Админка» на сайте',
        href: '/admin/settings/admin-link',
        resourceId: 'admin.settings.admin-link',
      },
      {
        label: 'Письмо директору',
        href: '/admin/settings/director-message',
        resourceId: 'admin.settings.director-message',
      },
      {
        label: 'Записаться на замер',
        href: '/admin/settings/measurement-form',
        resourceId: 'admin.settings.measurement-form',
      },
      {
        label: 'Заказать звонок',
        href: '/admin/settings/callback-form',
        resourceId: 'admin.settings.callback-form',
      },
      {
        label: 'Рассчитать стоимость',
        href: '/admin/settings/quote-form',
        resourceId: 'admin.settings.quote-form',
      },
      {
        label: 'PWA и обновления',
        href: '/admin/settings/pwa',
        resourceId: 'admin.settings.pwa',
      },
      {
        label: 'Оформление договоров',
        href: '/admin/contract-documents',
        resourceId: 'admin.contract-documents',
        children: [
          {
            label: 'Инструкция по работе с разделом',
            href: '/admin/contract-documents/instruction',
            resourceId: 'admin.contract-documents.instruction',
          },
          {
            label: 'Исполнители',
            href: '/admin/contract-documents/requisites',
            resourceId: 'admin.contract-documents.requisites',
          },
          {
            label: 'Менеджеры',
            href: '/admin/contract-documents/signatories',
            resourceId: 'admin.contract-documents.signatories',
          },
          {
            label: 'Библиотека шаблонов',
            href: '/admin/contract-documents/templates',
            resourceId: 'admin.contract-documents.templates',
          },
          {
            label: 'Сроки договоров',
            href: '/admin/contract-documents/settings',
            resourceId: 'admin.contract-documents.repair-settings',
          },
          {
            label: 'Наценки договоров',
            href: '/admin/contract-documents/settings/markups',
            resourceId: 'admin.contract-documents.markups',
          },
        ],
      },
      { label: 'Роли', href: '/admin/settings/roles', resourceId: 'admin.settings.roles' },
      { label: 'Управление пользователями', href: '/admin/users', resourceId: 'admin.users' },
    ],
  },
];

function filterNavByAccess(
  items: NavItem[],
  hasAccess: (id: string | undefined) => boolean
): NavItem[] {
  return items
    .map((item) => {
      if (!item.children) {
        return hasAccess(item.resourceId) ? item : null;
      }
      const filteredChildren = filterNavChildrenByAccess(item.children, hasAccess);
      const visible = hasAccess(item.resourceId) || filteredChildren.length > 0;
      return visible ? { ...item, children: filteredChildren } : null;
    })
    .filter((x): x is NavItem => x !== null);
}

function filterNavChildrenByAccess(
  children: NavChild[],
  hasAccess: (id: string | undefined) => boolean
): NavChild[] {
  return children
    .map((child) => {
      if (!child.children) {
        return hasAccess(child.resourceId) ? child : null;
      }
      const filteredNested = filterNavChildrenByAccess(child.children, hasAccess);
      const visible = hasAccess(child.resourceId) || filteredNested.length > 0;
      return visible ? { ...child, children: filteredNested } : null;
    })
    .filter((x): x is NavChild => x !== null);
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
  const { hasAccess } = useAdminAccessibleResources();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
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

  const navItems = useMemo(() => filterNavByAccess(baseNavItems, hasAccess), [hasAccess]);

  /** Пункты без подменю (напр. «Договора», «Расчёты») — не дают подсвечивать hub `/admin/contract-documents` в настройках. */
  const topLevelOnlyHrefs = useMemo(
    () => navItems.filter((item) => !item.children).map((item) => item.href),
    [navItems]
  );

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

  const isActive = useCallback(
    (href: string) => {
      const path = pathname ?? '';
      if (href === '/admin') {
        return path === '/admin';
      }
      if (path !== href && !path.startsWith(`${href}/`)) {
        return false;
      }
      if (
        topLevelOnlyHrefs.length > 0 &&
        isShadowedByTopLevelNavPath(path, href, topLevelOnlyHrefs)
      ) {
        return false;
      }
      return true;
    },
    [pathname, topLevelOnlyHrefs]
  );

  const fromCategory = searchParams?.get('fromCategory');
  const isProductEditPage = pathname?.match(/^\/admin\/catalog\/products\/[^/]+\/edit/);

  const isChildActive = (children: NavChild[] | undefined): boolean => {
    if (!children) return false;
    return (
      getBestMatchingHref(pathname ?? '', collectAllNavHrefs(children), topLevelOnlyHrefs) !== null
    );
  };

  const isChildOrDescendantActive = (child: NavChild): boolean => {
    const nestedHrefs = child.children
      ? [child.href, ...child.children.map((n) => n.href)]
      : [child.href];
    return getBestMatchingHref(pathname ?? '', nestedHrefs, topLevelOnlyHrefs) !== null;
  };

  const isPathActive = (href: string, sectionNavHrefs: string[]) => {
    if (isProductEditPage && fromCategory) {
      const categoryHref = `/admin/catalog/products/category/${fromCategory}`;
      return href === categoryHref;
    }
    return getBestMatchingHref(pathname ?? '', sectionNavHrefs, topLevelOnlyHrefs) === href;
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- раскрытие по pathname; isActive/isChild* меняются с pathname
  }, [pathname, navItems]);

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
        <Link href="/admin" className={styles.logo} aria-label="Цифровая платформа">
          <AdminPlatformBrand collapsed={collapsed} />
        </Link>
        <button className={styles.toggleBtn} onClick={onToggle}>
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => {
          const sectionNavHrefs = item.children ? collectAllNavHrefs(item.children) : [];
          return (
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
                        <AdminAccessIcon size={16} />
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
                                  <AdminAccessIcon size={14} />
                                </button>
                              )}
                            </div>
                            {isNestedExpanded(child) && (
                              <div className={styles.submenuNested}>
                                {child.children.map((nested) => (
                                  <div key={nested.href} className={styles.submenuLinkRow}>
                                    <Link
                                      href={getSafeHref(nested.href, '/')}
                                      className={`${styles.submenuLink} ${
                                        isPathActive(nested.href, sectionNavHrefs)
                                          ? styles.active
                                          : ''
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
                                        <AdminAccessIcon size={14} />
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
                              href={getSafeHref(child.href, '/')}
                              className={`${styles.submenuLink} ${
                                isPathActive(child.href, sectionNavHrefs) ? styles.active : ''
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
                                <AdminAccessIcon size={14} />
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
                    href={getSafeHref(item.href, '/')}
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
                      <AdminAccessIcon size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
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
