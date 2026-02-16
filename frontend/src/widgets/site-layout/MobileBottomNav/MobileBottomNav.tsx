'use client';

import {
  HeartIcon,
  RectangleGroupIcon,
  ShoppingCartIcon,
  Squares2X2Icon,
  UserIcon,
} from '@heroicons/react/24/outline';

import type React from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useUserAuth } from '@/features/auth/context/UserAuthContext';
import { useCart, useCompare, useWishlist } from '@/shared/lib/hooks';

import styles from './MobileBottomNav.module.css';

const navItems: Array<{
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  authHref?: string;
}> = [
  { href: '/catalog/products', label: 'Каталог', Icon: RectangleGroupIcon },
  { href: '/compare', label: 'Сравнить', Icon: Squares2X2Icon },
  { href: '/cart', label: 'Корзина', Icon: ShoppingCartIcon },
  { href: '/favorites', label: 'Избранное', Icon: HeartIcon },
  { href: '/profile', label: 'Кабинет', Icon: UserIcon, authHref: '/login' },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useUserAuth();
  const { count: cartCount } = useCart();
  const { count: compareCount } = useCompare();
  const { count: wishlistCount } = useWishlist();

  const getCount = (href: string): number => {
    if (href === '/compare') return compareCount;
    if (href === '/cart') return cartCount;
    if (href === '/favorites') return wishlistCount;
    return 0;
  };

  return (
    <nav className={styles.bottomNav} aria-label="Мобильная навигация">
      <ul className={styles.list}>
        {navItems.map(({ href, label, Icon, authHref }) => {
          const linkHref = authHref && !isAuthenticated ? authHref : href;
          const isActive =
            href === '/catalog/products'
              ? pathname.startsWith('/catalog')
              : pathname === href || pathname.startsWith(href + '/');
          const count = getCount(href);
          const showCount = count > 0;

          return (
            <li key={href} className={styles.item}>
              <Link
                href={linkHref}
                className={`${styles.link} ${isActive ? styles.linkActive : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={styles.iconWrap}>
                  <Icon className={styles.icon} />
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
