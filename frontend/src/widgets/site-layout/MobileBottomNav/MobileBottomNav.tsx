'use client';

import {
  Cog6ToothIcon,
  HeartIcon,
  HomeIcon,
  RectangleGroupIcon,
  ShoppingCartIcon,
  Squares2X2Icon,
  UserIcon,
} from '@heroicons/react/24/outline';

import type React from 'react';
import { useEffect, useState } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useUserAuth } from '@/features/auth/context/UserAuthContext';
import { getAvatarUrl, getInitials } from '@/shared/lib/avatar';
import { useSitePublicConfig } from '@/shared/lib/contexts/SitePublicConfigContext';
import { useCart, useCompare, useWishlist } from '@/shared/lib/hooks';

import styles from './MobileBottomNav.module.css';

const navItems: Array<{
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  authHref?: string;
}> = [
  { href: '/catalog/products', label: 'Каталог', Icon: RectangleGroupIcon },
  { href: '/catalog/services', label: 'Ремонт квартир', Icon: HomeIcon },
  { href: '/compare', label: 'Сравнить', Icon: Squares2X2Icon },
  { href: '/favorites', label: 'Избранное', Icon: HeartIcon },
  { href: '/cart', label: 'Корзина', Icon: ShoppingCartIcon },
  { href: '/profile', label: 'Кабинет', Icon: UserIcon, authHref: '/login' },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const { isAuthenticated, user } = useUserAuth();

  useEffect(() => {
    setAvatarLoadError(false);
  }, [user?.avatar]);
  const { rolesShowAdminLinkMobile } = useSitePublicConfig();
  const isAdmin =
    !!user?.role &&
    rolesShowAdminLinkMobile.length > 0 &&
    rolesShowAdminLinkMobile.includes(user.role);
  const { count: cartCount } = useCart();
  const { count: compareCount } = useCompare();
  const { count: wishlistCount } = useWishlist();

  const getCount = (href: string): number => {
    if (href === '/compare') return compareCount;
    if (href === '/cart') return cartCount;
    if (href === '/favorites') return wishlistCount;
    return 0;
  };

  const items: Array<{
    href: string;
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
    authHref?: string;
  }> = [
    ...navItems,
    ...(isAdmin ? [{ href: '/admin', label: 'Админка', Icon: Cog6ToothIcon }] : []),
  ];

  const path = pathname ?? '';

  return (
    <nav className={styles.bottomNav} aria-label="Мобильная навигация">
      <ul className={styles.list}>
        {items.map(({ href, label, Icon, authHref }) => {
          const linkHref = authHref && !isAuthenticated ? authHref : href;
          const isActive =
            href === '/catalog/products'
              ? path.startsWith('/catalog/products')
              : href === '/catalog/services'
                ? path.startsWith('/catalog/services')
                : path === href || path.startsWith(href + '/');
          const count = getCount(href);
          const showCount = count > 0;

          const showProfileAvatar =
            href === '/profile' && isAuthenticated && user && linkHref === '/profile';

          return (
            <li key={href} className={styles.item}>
              <Link
                href={linkHref}
                className={`${styles.link} ${isActive ? styles.linkActive : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={styles.iconWrap}>
                  {showProfileAvatar ? (
                    user.avatar && !avatarLoadError ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getAvatarUrl(user.avatar) ?? ''}
                        alt=""
                        className={styles.profileAvatar}
                        onError={() => setAvatarLoadError(true)}
                      />
                    ) : (
                      <span className={styles.profileInitials}>
                        {getInitials(user.firstName, user.lastName, user.email)}
                      </span>
                    )
                  ) : (
                    <Icon className={styles.icon} />
                  )}
                  {showCount && <span className={styles.badge}>{count > 99 ? '99+' : count}</span>}
                </span>
                <span className={styles.label}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
