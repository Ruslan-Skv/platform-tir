'use client';

import {
  ChartBarIcon,
  HeartIcon,
  MoonIcon,
  ShoppingCartIcon,
  SunIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

import React from 'react';

import { useRouter } from 'next/navigation';

import { useUserAuth } from '@/features/auth/context/UserAuthContext';
import { useTheme } from '@/features/theme';
import { useCart, useCompare, useWishlist } from '@/shared/lib/hooks';

import styles from './TopBar.module.css';

function getAvatarUrl(avatar: string | null | undefined): string | null {
  if (!avatar) return null;
  if (avatar.startsWith('http')) return avatar;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  const base = apiUrl.replace(/\/api\/v1\/?$/, '');
  return `${base}${avatar}`;
}

function getInitials(firstName: string | null, lastName: string | null, email: string): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName.slice(0, 2).toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return '?';
}

export const TopBar: React.FC = () => {
  const { isDarkTheme, toggleTheme } = useTheme();
  const router = useRouter();
  const { count: wishlistCount } = useWishlist();
  const { count: compareCount } = useCompare();
  const { count: cartCount } = useCart();
  const { isAuthenticated, user } = useUserAuth();

  const handleCompareClick = () => {
    router.push('/compare');
  };

  const handleProfileClick = () => {
    if (isAuthenticated) {
      router.push('/profile');
    } else {
      router.push('/login');
    }
  };

  return (
    <div className={styles.topBar}>
      {/* Мобильный телефон */}
      {/* <div className={styles.contactMobile}>
        <span className={styles.contact}>8-(8152)-60-12-70</span>
      </div> */}

      <div className={styles.container}>
        {/* Десктопный телефон */}
        <div className={styles.desktopContact}>
          <span className={styles.contact}>8-(8152)-60-12-70</span>
        </div>

        {/* Утилиты */}
        <div className={styles.utilities}>
          <div className={styles.contactMobile}>
            <span className={styles.contact}>8-(8152)-60-12-70</span>
          </div>
          {/* Сравнение товаров */}
          <button onClick={handleCompareClick} className={styles.utilityButton} type="button">
            <div className={styles.iconWrapper}>
              <ChartBarIcon className={styles.icon} />
              {compareCount > 0 && (
                <span className={styles.badge}>{compareCount > 99 ? '99+' : compareCount}</span>
              )}
            </div>
            <span className={styles.utilityText}>Сравнение</span>
          </button>

          {/* Личный кабинет */}
          <button onClick={handleProfileClick} className={styles.utilityButton} type="button">
            {isAuthenticated && user ? (
              <>
                {user.avatar ? (
                  <img
                    src={getAvatarUrl(user.avatar) ?? ''}
                    alt=""
                    className={styles.profileAvatar}
                  />
                ) : (
                  <div className={styles.profileInitials}>
                    {getInitials(user.firstName, user.lastName, user.email)}
                  </div>
                )}
                <span className={styles.profileName}>
                  {user.firstName || user.lastName
                    ? [user.firstName, user.lastName].filter(Boolean).join(' ')
                    : user.email}
                </span>
              </>
            ) : (
              <>
                <UserIcon className={styles.icon} />
                <span className={styles.utilityText}>Кабинет</span>
              </>
            )}
          </button>

          {/* Избранное */}
          <button
            onClick={() => router.push('/favorites')}
            className={styles.utilityButton}
            type="button"
          >
            <div className={styles.iconWrapper}>
              <HeartIcon className={styles.icon} />
              {wishlistCount > 0 && (
                <span className={styles.badge}>{wishlistCount > 99 ? '99+' : wishlistCount}</span>
              )}
            </div>
            <span className={styles.utilityText}>Избранное</span>
          </button>

          {/* Корзина */}
          <button
            onClick={() => router.push('/cart')}
            className={styles.utilityButton}
            type="button"
          >
            <div className={styles.iconWrapper}>
              <ShoppingCartIcon className={styles.icon} />
              {cartCount > 0 && (
                <span className={styles.badge}>{cartCount > 99 ? '99+' : cartCount}</span>
              )}
            </div>
            <span className={styles.utilityText}>Корзина</span>
          </button>

          {/* Переключение темы */}
          <button onClick={toggleTheme} className={styles.utilityButton} type="button">
            {isDarkTheme ? (
              <SunIcon className={styles.icon} />
            ) : (
              <MoonIcon className={styles.icon} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
