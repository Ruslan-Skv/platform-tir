'use client';

import {
  Cog6ToothIcon,
  HeartIcon,
  MoonIcon,
  ShoppingCartIcon,
  SunIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

import React, { useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useUserAuth } from '@/features/auth/context/UserAuthContext';
import { useTheme } from '@/features/theme';
import { resolveAdminHomePathForRole } from '@/shared/config/admin-resources';
import { getAvatarUrl, getInitials } from '@/shared/lib/avatar';
import { useSitePublicConfig } from '@/shared/lib/contexts/SitePublicConfigContext';
import { useCart, useCompare, useWishlist } from '@/shared/lib/hooks';

import { CatalogSearchField } from '../CatalogSearchField';
import type { CatalogHeaderSearchState } from '../useCatalogHeaderSearch';
import styles from './TopBar.module.css';

export interface TopBarProps {
  /** Одно состояние поиска на весь header (десктоп + мобилка); null — плейсхолдер до Suspense */
  catalogSearch: CatalogHeaderSearchState | null;
  /** false — без поля поиска (в липкой шапке при прокрутке поиск переезжает в пилюлю) */
  showSearch?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ catalogSearch, showSearch = true }) => {
  const { isDarkTheme, toggleTheme } = useTheme();
  const router = useRouter();
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const { isAuthenticated, user } = useUserAuth();
  const { rolesShowAdminLinkDesktop } = useSitePublicConfig();
  const isAdmin =
    !!user?.role &&
    rolesShowAdminLinkDesktop.length > 0 &&
    rolesShowAdminLinkDesktop.includes(user.role);
  const adminEntryPath = resolveAdminHomePathForRole(user?.role);
  const { count: wishlistCount } = useWishlist();
  const { count: compareCount } = useCompare();
  const { count: cartCount } = useCart();

  useEffect(() => {
    setAvatarLoadError(false);
  }, [user?.avatar]);

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
      <div className={styles.container}>
        {/* Утилиты */}
        <div className={styles.utilities}>
          {/* Поиск — слева от иконки «Сравнить» (в липкой шапке перенесён в пилюлю) */}
          {showSearch && (
            <CatalogSearchField className={styles.searchShell} catalogSearch={catalogSearch} />
          )}
          {/* Сравнение товаров (иконка как в карточках товаров) */}
          <button
            onClick={handleCompareClick}
            className={styles.utilityButton}
            type="button"
            aria-label="Сравнение"
            data-tooltip="Сравнение"
          >
            <div className={styles.iconWrapper}>
              <span className={`${styles.icon} ${styles.iconCompare}`} aria-hidden>
                ⚖
              </span>
              {compareCount > 0 && (
                <span className={styles.badge}>{compareCount > 99 ? '99+' : compareCount}</span>
              )}
            </div>
            <span className={styles.utilityText}></span>
          </button>

          {/* Избранное */}
          <button
            onClick={() => router.push('/favorites')}
            className={styles.utilityButton}
            type="button"
            aria-label="Избранное"
            data-tooltip="Избранное"
          >
            <div className={styles.iconWrapper}>
              <HeartIcon className={styles.icon} />
              {wishlistCount > 0 && (
                <span className={styles.badge}>{wishlistCount > 99 ? '99+' : wishlistCount}</span>
              )}
            </div>
            <span className={styles.utilityText}></span>
          </button>

          {/* Корзина */}
          <button
            onClick={() => router.push('/cart')}
            className={styles.utilityButton}
            type="button"
            aria-label="Корзина"
            data-tooltip="Корзина"
          >
            <div className={styles.iconWrapper}>
              <ShoppingCartIcon className={styles.icon} />
              {cartCount > 0 && (
                <span className={styles.badge}>{cartCount > 99 ? '99+' : cartCount}</span>
              )}
            </div>
            <span className={styles.utilityText}></span>
          </button>

          {/* Админка (только для админов) */}
          {isAdmin && (
            <Link
              href={adminEntryPath}
              className={styles.utilityButton}
              aria-label="Админка"
              data-tooltip="Перейти в админку"
            >
              <Cog6ToothIcon className={styles.icon} />
              <span className={styles.utilityText}></span>
            </Link>
          )}

          {/* Личный кабинет */}
          <button
            onClick={handleProfileClick}
            className={styles.utilityButton}
            type="button"
            aria-label={isAuthenticated ? 'Профиль' : 'Войти'}
            data-tooltip={isAuthenticated ? 'Профиль' : 'Войти'}
          >
            {isAuthenticated && user ? (
              <>
                {user.avatar && !avatarLoadError ? (
                  <img
                    src={getAvatarUrl(user.avatar) ?? ''}
                    alt=""
                    className={styles.profileAvatar}
                    onError={() => setAvatarLoadError(true)}
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
                <span className={styles.utilityText}></span>
              </>
            )}
          </button>

          {/* Переключение темы */}
          <button
            onClick={toggleTheme}
            className={styles.utilityButton}
            type="button"
            aria-label={isDarkTheme ? 'Светлая тема' : 'Тёмная тема'}
            data-tooltip={isDarkTheme ? 'Светлая тема' : 'Тёмная тема'}
          >
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
