'use client';

import {
  Cog6ToothIcon,
  HeartIcon,
  MagnifyingGlassIcon,
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
import { getAvatarUrl, getInitials } from '@/shared/lib/avatar';
import { useSitePublicConfig } from '@/shared/lib/contexts/SitePublicConfigContext';
import { useCart, useCompare, useWishlist } from '@/shared/lib/hooks';

import type { CatalogHeaderSearchState } from '../useCatalogHeaderSearch';
import styles from './TopBar.module.css';

export interface TopBarProps {
  /** Одно состояние поиска на весь header (десктоп + мобилка); null — плейсхолдер до Suspense */
  catalogSearch: CatalogHeaderSearchState | null;
}

function TopBarCatalogSearch({ catalogSearch }: { catalogSearch: CatalogHeaderSearchState }) {
  const {
    searchQuery,
    suggestions,
    loadingSug,
    highlight,
    listId,
    setHighlight,
    cancelBlurClose,
    pickSuggestion,
    handleSearchSubmit,
    handleInputBlur,
    handleInputFocus,
    handleInputChange,
    handleInputKeyDown,
    showDropdown,
    showEmpty,
  } = catalogSearch;

  return (
    <div className={styles.searchShell}>
      <form className={styles.searchForm} onSubmit={handleSearchSubmit} role="search">
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Поиск..."
          aria-label="Поиск"
          aria-expanded={showDropdown || showEmpty}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={searchQuery}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
        />
        <button type="submit" className={styles.searchSubmit} aria-label="Искать">
          <MagnifyingGlassIcon className={styles.searchIcon} />
        </button>
      </form>

      {(showDropdown || showEmpty) && (
        <ul
          id={listId}
          className={styles.suggestionsList}
          role="listbox"
          aria-label="Подсказки товаров"
          onMouseDown={cancelBlurClose}
        >
          {loadingSug && (
            <li className={styles.suggestionsLoading} role="presentation">
              Поиск…
            </li>
          )}
          {!loadingSug &&
            suggestions.map((s, index) => (
              <li key={s.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={highlight === index}
                  className={styles.suggestionItem}
                  data-active={highlight === index ? 'true' : 'false'}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    cancelBlurClose();
                  }}
                  onClick={() => pickSuggestion(s)}
                  onMouseEnter={() => setHighlight(index)}
                >
                  {s.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className={styles.suggestionThumb}
                      src={s.imageUrl}
                      alt=""
                      width={40}
                      height={40}
                    />
                  ) : (
                    <span className={styles.suggestionThumb} aria-hidden />
                  )}
                  <span className={styles.suggestionText}>
                    <span className={styles.suggestionName}>{s.name}</span>
                    {s.sku ? <span className={styles.suggestionMeta}>Арт. {s.sku}</span> : null}
                  </span>
                </button>
              </li>
            ))}
          {!loadingSug && suggestions.length === 0 && (
            <li className={styles.suggestionsLoading} role="presentation">
              Ничего не найдено
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export const TopBar: React.FC<TopBarProps> = ({ catalogSearch }) => {
  const { isDarkTheme, toggleTheme } = useTheme();
  const router = useRouter();
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const { isAuthenticated, user } = useUserAuth();
  const { rolesShowAdminLinkDesktop } = useSitePublicConfig();
  const isAdmin =
    !!user?.role &&
    rolesShowAdminLinkDesktop.length > 0 &&
    rolesShowAdminLinkDesktop.includes(user.role);
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
          {/* Поиск — слева от иконки «Сравнить» */}
          {catalogSearch ? (
            <TopBarCatalogSearch catalogSearch={catalogSearch} />
          ) : (
            <div className={styles.searchShell} aria-hidden>
              <div className={styles.searchForm}>
                <input
                  type="search"
                  className={styles.searchInput}
                  placeholder="Поиск..."
                  disabled
                  readOnly
                />
                <span className={styles.searchSubmit}>
                  <MagnifyingGlassIcon className={styles.searchIcon} />
                </span>
              </div>
            </div>
          )}
          {/* Сравнение товаров (иконка как в карточках товаров) */}
          <button onClick={handleCompareClick} className={styles.utilityButton} type="button">
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
              href="/admin"
              className={styles.utilityButton}
              title="Перейти в админку"
              aria-label="Админка"
            >
              <Cog6ToothIcon className={styles.icon} />
              <span className={styles.utilityText}></span>
            </Link>
          )}

          {/* Личный кабинет */}
          <button onClick={handleProfileClick} className={styles.utilityButton} type="button">
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
