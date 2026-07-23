'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  createHasAccessChecker,
  readCachedAdminAccessibleResources,
  useAdminAccessibleResources,
} from '@/features/admin/contexts/AdminAccessibleResourcesContext';
import { useAuth } from '@/features/auth';
import { useAdminSidebarUiPrefs } from '@/shared/lib/admin-sidebar-ui-prefs';
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
  mobileOpen?: boolean;
  onMobileClose?: () => void;
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

/** Кадр drill-down в мобильной сетке сайдбара. */
type GridNavFrame = {
  title: string;
  items: NavChild[];
  parentIcon?: string;
};

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
      { label: 'Входящие заявки', href: '/admin/leads', resourceId: 'admin.forms' },
      { label: 'Чат поддержки', href: '/admin/support', resourceId: 'admin.support' },
      { label: 'Воронка продаж', href: '/admin/crm/funnel', resourceId: 'admin.crm.funnel' },
      { label: 'Задачи', href: '/admin/crm/tasks', resourceId: 'admin.crm.tasks' },
      {
        label: 'Учёт рабочего времени',
        href: '/admin/crm/my-work-day',
        resourceId: 'admin.crm.my-work-day',
        children: [
          {
            label: 'Мой рабочий день',
            href: '/admin/crm/my-work-day',
            resourceId: 'admin.crm.my-work-day',
          },
          {
            label: 'Журнал сотрудников',
            href: '/admin/crm/work-days',
            resourceId: 'admin.crm.work-days',
          },
        ],
      },
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
      { label: 'Вакансии', href: '/admin/content/careers', resourceId: 'admin.content.careers' },
      { label: 'Контакты', href: '/admin/content/contacts', resourceId: 'admin.content.contacts' },
      {
        label: 'Миссия компании',
        href: '/admin/content/mission',
        resourceId: 'admin.content.mission',
      },
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
      {
        label: 'Обратная связь по сайту',
        href: '/admin/content/site-feedback',
        resourceId: 'admin.settings',
      },
    ],
  },
  {
    label: 'Квизы',
    href: '/admin/quiz/mebel',
    icon: '🎯',
    resourceId: 'admin.quiz',
    children: [
      { label: 'Мебель', href: '/admin/quiz/mebel', resourceId: 'admin.quiz.mebel' },
      { label: 'Ремонт', href: '/admin/quiz/remont', resourceId: 'admin.quiz.remont' },
    ],
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
      {
        label: 'Характеристики',
        href: '/admin/catalog/attributes',
        resourceId: 'admin.catalog.attributes',
      },
      {
        label: 'Комплектующие',
        href: '/admin/catalog/components',
        resourceId: 'admin.catalog.components',
      },
    ],
  },
  {
    label: 'Прайсы',
    href: '/admin/price-lists',
    icon: '🏷️',
    resourceId: 'admin.price-lists',
    children: [
      {
        label: 'Натяжные потолки',
        href: '/admin/price-lists/ceilings',
        resourceId: 'admin.price-lists.ceilings',
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
        label: 'Внешний вид админки',
        href: '/admin/settings/appearance',
        resourceId: 'admin.settings.appearance',
      },
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
        label: 'Уведомления в админке',
        href: '/admin/settings/notifications',
        resourceId: 'admin.settings.notifications',
      },
      {
        label: 'Каналы уведомлений о заявках',
        href: '/admin/settings/notification-channels',
        resourceId: 'admin.settings.notification-channels',
      },
      {
        label: 'Оформление заказов',
        href: '/admin/settings/checkout',
        resourceId: 'admin.settings.checkout',
      },
      {
        label: 'Информация о продавце',
        href: '/admin/settings/seller-legal',
        resourceId: 'admin.settings.seller-legal',
      },
      {
        label: 'Информация на сайте (не оферта)',
        href: '/admin/settings/site-disclaimer',
        resourceId: 'admin.settings.site-disclaimer',
      },
      {
        label: 'Публичные оферты',
        href: '/admin/settings/public-offers',
        resourceId: 'admin.settings.public-offer',
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
        label: 'Рассчитать стоимость (виды работ)',
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
      {
        label: 'Учёт рабочего времени',
        href: '/admin/settings/work-days',
        resourceId: 'admin.settings.work-days',
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
  mobileOpen = false,
  onMobileClose,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [fromCategory, setFromCategory] = useState<string | null>(null);
  const { user: currentUser } = useAuth();
  const { hasAccess, isLoading, resourceIds } = useAdminAccessibleResources();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [isResizing, setIsResizing] = useState(false);
  const [accessModalResourceId, setAccessModalResourceId] = useState<string | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [gridNavStack, setGridNavStack] = useState<GridNavFrame[]>([]);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);
  const { prefs: sidebarUiPrefs } = useAdminSidebarUiPrefs();

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  /** На свёрнутой десктопной рейке иконки нужны всегда. */
  const showNavIcons = !sidebarUiPrefs.hideIcons || collapsed;
  const useMobileGrid = isMobileViewport && sidebarUiPrefs.mobileLayout === 'grid3';
  const gridDrillFrame = gridNavStack.length > 0 ? gridNavStack[gridNavStack.length - 1] : null;
  const isAccessFocus = useCallback(
    (resourceId?: string) => Boolean(resourceId && accessModalResourceId === resourceId),
    [accessModalResourceId]
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1024px)');
    const syncMobileViewport = () => setIsMobileViewport(mediaQuery.matches);
    syncMobileViewport();
    mediaQuery.addEventListener('change', syncMobileViewport);
    return () => mediaQuery.removeEventListener('change', syncMobileViewport);
  }, []);

  useEffect(() => {
    if (!mobileOpen || !useMobileGrid) {
      setGridNavStack([]);
    }
  }, [mobileOpen, useMobileGrid]);

  useEffect(() => {
    setGridNavStack([]);
  }, [pathname]);

  const pushGridNavFrame = useCallback((frame: GridNavFrame) => {
    setGridNavStack((prev) => [...prev, frame]);
  }, []);

  const popGridNavFrame = useCallback(() => {
    setGridNavStack((prev) => prev.slice(0, -1));
  }, []);

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

  const navItems = useMemo(() => {
    const filtered = filterNavByAccess(baseNavItems, hasAccess);
    if (filtered.length > 0 || currentUser?.role === 'SUPER_ADMIN') {
      return filtered;
    }

    const cached = readCachedAdminAccessibleResources(currentUser?.id);
    if (cached.length > 0) {
      const cachedIds = new Set(cached.map((resource) => resource.id));
      const cachedHasAccess = createHasAccessChecker(cachedIds, currentUser?.role);
      const fromCache = filterNavByAccess(baseNavItems, cachedHasAccess);
      if (fromCache.length > 0) {
        return fromCache;
      }
    }

    if (isLoading && resourceIds.size === 0) {
      return [];
    }

    return filtered;
  }, [hasAccess, isLoading, resourceIds.size, currentUser?.role, currentUser?.id]);

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

  useEffect(() => {
    if (typeof window === 'undefined') {
      setFromCategory(null);
      return;
    }
    setFromCategory(new URLSearchParams(window.location.search).get('fromCategory'));
  }, [pathname]);

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
    <>
      {mobileOpen ? (
        <button
          type="button"
          className={styles.mobileBackdrop}
          aria-label="Закрыть меню"
          onClick={onMobileClose}
        />
      ) : null}
      <aside
        className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobileOpen ? styles.open : ''} ${isResizing ? styles.resizing : ''} ${sidebarUiPrefs.hideIcons ? styles.hideIcons : ''} ${useMobileGrid ? styles.mobileGrid : ''}`}
        style={isMobileViewport ? undefined : { width: collapsed ? undefined : width }}
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
          <Link
            href={getSafeHref('/', '/')}
            className={styles.logo}
            title="Вернуться на публичный сайт"
            aria-label="Вернуться на публичный сайт"
          >
            <AdminPlatformBrand collapsed={collapsed} />
          </Link>
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={isMobileViewport ? (onMobileClose ?? onToggle) : onToggle}
            title={
              isMobileViewport
                ? 'Закрыть меню'
                : collapsed
                  ? 'Развернуть боковое меню'
                  : 'Свернуть боковое меню'
            }
            aria-label={
              isMobileViewport
                ? 'Закрыть меню'
                : collapsed
                  ? 'Развернуть боковое меню'
                  : 'Свернуть боковое меню'
            }
          >
            {isMobileViewport ? '✕' : collapsed ? '→' : '←'}
          </button>
        </div>

        <nav
          className={`${styles.nav} ${useMobileGrid && !gridDrillFrame ? styles.navMobileGrid : ''} ${useMobileGrid && gridDrillFrame ? styles.navMobileDrill : ''}`}
        >
          {useMobileGrid && gridDrillFrame ? (
            <>
              <div className={styles.gridDrillHeader}>
                <button
                  type="button"
                  className={styles.gridDrillBack}
                  onClick={popGridNavFrame}
                  aria-label="Назад"
                >
                  ← Назад
                </button>
                <div className={styles.gridDrillTitle}>
                  {showNavIcons && gridDrillFrame.parentIcon ? (
                    <span className={styles.gridDrillTitleIcon} aria-hidden>
                      {gridDrillFrame.parentIcon}
                    </span>
                  ) : null}
                  <span className={styles.gridDrillTitleText}>{gridDrillFrame.title}</span>
                </div>
              </div>
              <div className={styles.gridDrillList}>
                {gridDrillFrame.items.map((child, childIndex) => {
                  const sectionNavHrefs = collectAllNavHrefs(gridDrillFrame.items);
                  const rowKey = `${child.href}::${child.label}::${childIndex}`;
                  if (child.children?.length) {
                    return (
                      <div
                        key={rowKey}
                        className={`${styles.gridDrillRow}${
                          isAccessFocus(child.resourceId) ? ` ${styles.accessFocus}` : ''
                        }`}
                      >
                        <button
                          type="button"
                          className={`${styles.gridDrillItem} ${
                            isChildOrDescendantActive(child) ? styles.active : ''
                          }`}
                          onClick={() =>
                            pushGridNavFrame({
                              title: child.label,
                              items: child.children!,
                            })
                          }
                        >
                          <span className={styles.gridDrillItemLabel}>{child.label}</span>
                          <span className={styles.gridDrillChevron} aria-hidden>
                            ›
                          </span>
                        </button>
                        {isSuperAdmin && child.resourceId ? (
                          <button
                            type="button"
                            className={`${styles.accessIconSubmenu}${
                              isAccessFocus(child.resourceId) ? ` ${styles.accessIconActive}` : ''
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setAccessModalResourceId(child.resourceId!);
                            }}
                            title="Доступ"
                            aria-label={`Управление доступом: ${child.label}`}
                          >
                            <AdminAccessIcon size={14} />
                          </button>
                        ) : null}
                      </div>
                    );
                  }
                  return (
                    <div
                      key={rowKey}
                      className={`${styles.gridDrillRow}${
                        isAccessFocus(child.resourceId) ? ` ${styles.accessFocus}` : ''
                      }`}
                    >
                      <Link
                        href={getSafeHref(child.href, '/')}
                        className={`${styles.gridDrillItem} ${
                          isPathActive(child.href, sectionNavHrefs) ? styles.active : ''
                        }`}
                        onClick={() => onMobileClose?.()}
                      >
                        <span className={styles.gridDrillItemLabel}>{child.label}</span>
                      </Link>
                      {isSuperAdmin && child.resourceId ? (
                        <button
                          type="button"
                          className={`${styles.accessIconSubmenu}${
                            isAccessFocus(child.resourceId) ? ` ${styles.accessIconActive}` : ''
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setAccessModalResourceId(child.resourceId!);
                          }}
                          title="Доступ"
                          aria-label={`Управление доступом: ${child.label}`}
                        >
                          <AdminAccessIcon size={14} />
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            navItems.map((item) => {
              const sectionNavHrefs = item.children ? collectAllNavHrefs(item.children) : [];
              const isItemExpanded = Boolean(item.children && expandedItems.includes(item.href));
              return (
                <div key={item.href} className={styles.navItem}>
                  {item.children ? (
                    <>
                      <div
                        className={`${styles.navLinkRow}${
                          isAccessFocus(item.resourceId) ? ` ${styles.accessFocus}` : ''
                        }`}
                      >
                        <button
                          className={`${styles.navLink} ${
                            isActive(item.href) || isChildActive(item.children) ? styles.active : ''
                          }`}
                          onClick={() => {
                            if (useMobileGrid) {
                              pushGridNavFrame({
                                title: item.label,
                                items: item.children!,
                                parentIcon: item.icon,
                              });
                              return;
                            }
                            toggleExpand(item.href);
                          }}
                        >
                          {showNavIcons ? <span className={styles.icon}>{item.icon}</span> : null}
                          {!collapsed && (
                            <>
                              <span className={styles.label}>{item.label}</span>
                              <span
                                className={`${styles.arrow} ${
                                  !useMobileGrid && isItemExpanded ? styles.expanded : ''
                                }`}
                              >
                                {useMobileGrid ? '›' : '▼'}
                              </span>
                            </>
                          )}
                        </button>
                        {!collapsed && !useMobileGrid && isSuperAdmin && item.resourceId && (
                          <button
                            type="button"
                            className={`${styles.accessIcon}${
                              isAccessFocus(item.resourceId) ? ` ${styles.accessIconActive}` : ''
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setAccessModalResourceId(item.resourceId!);
                            }}
                            title="Доступ"
                            aria-label={`Управление доступом: ${item.label}`}
                          >
                            <AdminAccessIcon size={16} />
                          </button>
                        )}
                      </div>
                      {!useMobileGrid && !collapsed && isItemExpanded && (
                        <div className={styles.submenu}>
                          {item.children.map((child) =>
                            child.children ? (
                              <div key={child.label} className={styles.submenuGroup}>
                                <div
                                  className={`${styles.submenuGroupRowWrap}${
                                    isAccessFocus(child.resourceId) ? ` ${styles.accessFocus}` : ''
                                  }`}
                                >
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
                                      className={`${styles.accessIconSubmenu}${
                                        isAccessFocus(child.resourceId)
                                          ? ` ${styles.accessIconActive}`
                                          : ''
                                      }`}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setAccessModalResourceId(child.resourceId!);
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
                                      <div
                                        key={nested.href}
                                        className={`${styles.submenuLinkRow}${
                                          isAccessFocus(nested.resourceId)
                                            ? ` ${styles.accessFocus}`
                                            : ''
                                        }`}
                                      >
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
                                            className={`${styles.accessIconSubmenu}${
                                              isAccessFocus(nested.resourceId)
                                                ? ` ${styles.accessIconActive}`
                                                : ''
                                            }`}
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              setAccessModalResourceId(nested.resourceId!);
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
                              <div
                                key={child.label}
                                className={`${styles.submenuLinkRow}${
                                  isAccessFocus(child.resourceId) ? ` ${styles.accessFocus}` : ''
                                }`}
                              >
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
                                    className={`${styles.accessIconSubmenu}${
                                      isAccessFocus(child.resourceId)
                                        ? ` ${styles.accessIconActive}`
                                        : ''
                                    }`}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setAccessModalResourceId(child.resourceId!);
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
                    <div
                      className={`${styles.navLinkRow}${
                        isAccessFocus(item.resourceId) ? ` ${styles.accessFocus}` : ''
                      }`}
                    >
                      <Link
                        href={getSafeHref(item.href, '/')}
                        className={`${styles.navLink} ${isActive(item.href) ? styles.active : ''}`}
                        onClick={() => {
                          if (useMobileGrid) onMobileClose?.();
                        }}
                      >
                        {showNavIcons ? <span className={styles.icon}>{item.icon}</span> : null}
                        {!collapsed && <span className={styles.label}>{item.label}</span>}
                      </Link>
                      {!collapsed && !useMobileGrid && isSuperAdmin && item.resourceId && (
                        <button
                          type="button"
                          className={`${styles.accessIcon}${
                            isAccessFocus(item.resourceId) ? ` ${styles.accessIconActive}` : ''
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setAccessModalResourceId(item.resourceId!);
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
            })
          )}
        </nav>

        {accessModalResourceId && typeof document !== 'undefined'
          ? createPortal(
              <AccessModal
                resourceId={accessModalResourceId}
                onClose={() => setAccessModalResourceId(null)}
              />,
              document.body
            )
          : null}
      </aside>
    </>
  );
}
