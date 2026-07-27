'use client';

import {
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  EllipsisHorizontalIcon,
  HeartIcon,
  HomeIcon,
  PhoneIcon,
  RectangleGroupIcon,
  ShoppingCartIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';

import type React from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { useUserAuth } from '@/features/auth/context/UserAuthContext';
import { useFormContext } from '@/features/forms';
import { resolveAdminHomePathForRole } from '@/shared/config/admin-resources';
import { useSitePublicConfig } from '@/shared/lib/contexts/SitePublicConfigContext';
import { useCart, useCompare, useWishlist } from '@/shared/lib/hooks';
import { useChatSupportOpen } from '@/widgets/chat-support';

import styles from './MobileBottomNav.module.css';
import { OurWorksNavIcon, UsefulArticlesNavIcon } from './mobileBottomNavIcons';

const primaryNavItems: Array<{
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { href: '/catalog/products', label: 'Каталог', Icon: RectangleGroupIcon },
  { href: '/catalog/services', label: 'Ремонт квартир', Icon: HomeIcon },
  { href: '/compare', label: 'Сравнить', Icon: Squares2X2Icon },
  { href: '/favorites', label: 'Избранное', Icon: HeartIcon },
  { href: '/cart', label: 'Корзина', Icon: ShoppingCartIcon },
];

type MoreLinkEntry = {
  kind: 'link';
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
};

type MoreActionEntry = {
  kind: 'action';
  id: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
};

type MoreEntry = MoreLinkEntry | MoreActionEntry;

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const path = pathname ?? '';
  const { measurementModal, callbackModal } = useFormContext();
  const chatSupport = useChatSupportOpen();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const { isAuthenticated, user } = useUserAuth();
  const { rolesShowAdminLinkMobile } = useSitePublicConfig();
  const isAdmin =
    !!user?.role &&
    rolesShowAdminLinkMobile.length > 0 &&
    rolesShowAdminLinkMobile.includes(user.role);
  const adminEntryPath = resolveAdminHomePathForRole(user?.role);
  const { count: cartCount } = useCart();
  const { count: compareCount } = useCompare();
  const { count: wishlistCount } = useWishlist();

  const moreItems: MoreEntry[] = [
    { kind: 'link', href: '/blog', label: 'Полезные статьи', Icon: UsefulArticlesNavIcon },
    { kind: 'link', href: '/photo', label: 'Наши работы', Icon: OurWorksNavIcon },
    ...(isAuthenticated && chatSupport
      ? [
          {
            kind: 'action' as const,
            id: 'chat-support',
            label: 'Чат поддержки',
            Icon: ChatBubbleLeftRightIcon,
            onSelect: () => chatSupport.openChat(),
          },
        ]
      : []),
    {
      kind: 'action',
      id: 'measurement',
      label: 'Записаться на замер',
      Icon: CalendarDaysIcon,
      onSelect: () => measurementModal.open(),
    },
    {
      kind: 'action',
      id: 'callback',
      label: 'Заказать обратный звонок',
      Icon: PhoneIcon,
      onSelect: () => callbackModal.open(),
    },
    ...(isAdmin
      ? [
          {
            kind: 'link' as const,
            href: adminEntryPath,
            label: 'Админка',
            Icon: Cog6ToothIcon,
          },
        ]
      : []),
  ];

  const closeMore = useCallback(() => setMoreOpen(false), []);

  /** Avoid sync unmount of Link on click — that can abort App Router soft-nav until reload. */
  const onMoreLinkClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.altKey ||
        e.ctrlKey ||
        e.shiftKey
      ) {
        closeMore();
        return;
      }
      e.preventDefault();
      router.push(href);
      closeMore();
    },
    [closeMore, router]
  );

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMore();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen, closeMore]);

  useEffect(() => {
    closeMore();
  }, [path, closeMore]);

  useEffect(() => {
    if (!moreOpen) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (moreBtnRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      closeMore();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [moreOpen, closeMore]);

  const getCount = (href: string): number => {
    if (href === '/compare') return compareCount;
    if (href === '/cart') return cartCount;
    if (href === '/favorites') return wishlistCount;
    return 0;
  };

  const isPrimaryActive = (href: string): boolean => {
    if (href === '/catalog/products') return path.startsWith('/catalog/products');
    if (href === '/catalog/services') return path.startsWith('/catalog/services');
    return path === href || path.startsWith(`${href}/`);
  };

  const isMoreRouteActive = moreItems.some((entry) => {
    if (entry.kind !== 'link') return false;
    const { href } = entry;
    return href === '/blog'
      ? path === '/blog' || path.startsWith('/blog/')
      : href === '/photo'
        ? path === '/photo' || path.startsWith('/photo/')
        : path === href || path.startsWith(`${href}/`);
  });

  return (
    <nav className={styles.bottomNav} aria-label="Мобильная навигация">
      {moreOpen ? (
        <button
          type="button"
          className={styles.moreBackdrop}
          aria-label="Закрыть меню"
          onClick={closeMore}
        />
      ) : null}

      {moreOpen ? (
        <div
          id={panelId}
          ref={panelRef}
          className={styles.morePanel}
          role="dialog"
          aria-label="Дополнительные разделы"
        >
          <ul className={styles.moreList}>
            {moreItems.map((entry) => {
              if (entry.kind === 'action') {
                const { id, label, Icon, onSelect } = entry;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className={styles.moreLink}
                      onClick={() => {
                        onSelect();
                        closeMore();
                      }}
                    >
                      <Icon className={styles.moreIcon} />
                      <span>{label}</span>
                    </button>
                  </li>
                );
              }
              const { href, label, Icon } = entry;
              const isActive =
                href === '/blog'
                  ? path === '/blog' || path.startsWith('/blog/')
                  : href === '/photo'
                    ? path === '/photo' || path.startsWith('/photo/')
                    : path === href || path.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`${styles.moreLink} ${isActive ? styles.moreLinkActive : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={(e) => onMoreLinkClick(e, href)}
                  >
                    <Icon className={styles.moreIcon} />
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className={styles.barRow}>
        <ul className={styles.list}>
          {primaryNavItems.map(({ href, label, Icon }) => {
            const isActive = isPrimaryActive(href);
            const count = getCount(href);
            const showCount = count > 0;
            return (
              <li key={href} className={styles.item}>
                <Link
                  href={href}
                  className={`${styles.link} ${isActive ? styles.linkActive : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className={styles.iconWrap}>
                    <Icon className={styles.icon} />
                    {showCount ? (
                      <span className={styles.badge}>{count > 99 ? '99+' : count}</span>
                    ) : null}
                  </span>
                  <span className={styles.label}>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className={styles.moreSlot}>
          <button
            ref={moreBtnRef}
            type="button"
            className={`${styles.moreTrigger} ${isMoreRouteActive && !moreOpen ? styles.linkActive : ''} ${moreOpen ? styles.moreTriggerOpen : ''}`}
            aria-expanded={moreOpen}
            aria-controls={panelId}
            aria-haspopup="dialog"
            onClick={() => setMoreOpen((o) => !o)}
          >
            <span className={styles.iconWrap}>
              <EllipsisHorizontalIcon className={styles.icon} />
            </span>
            <span className={styles.label}>Прочее</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
