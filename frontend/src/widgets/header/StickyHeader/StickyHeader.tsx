'use client';

import {
  ArrowLeftIcon,
  Bars3Icon,
  MagnifyingGlassIcon,
  MoonIcon,
  PhoneIcon,
  SunIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

import React, { Suspense, useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useUserAuth } from '@/features/auth/context/UserAuthContext';
import { useTheme } from '@/features/theme';
import { getAvatarUrl, getInitials } from '@/shared/lib/avatar';
import { Logo } from '@/shared/ui/Logo';

import { ActionButtons } from '../ActionButtons';
import headerStyles from '../Header/Header.module.css';
import { Navigation } from '../Navigation';
import { TopBar } from '../TopBar';
import { type CatalogHeaderSearchState, useCatalogHeaderSearch } from '../useCatalogHeaderSearch';
import styles from './StickyHeader.module.css';

const PHONE_LINK = 'tel:+78152601270';

/** Порог прокрутки (px), после которого шапка трансформируется в компактную. */
const SCROLL_THRESHOLD = 100;

/** Состояние «страница прокручена» — пассивный слушатель скролла. */
function useHeaderScrolled(threshold: number) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > threshold);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [threshold]);

  return scrolled;
}

function StickyMobileCatalogSearch({ catalogSearch }: { catalogSearch: CatalogHeaderSearchState }) {
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
    <div className={headerStyles.mobileSearchShell}>
      <form className={headerStyles.mobileSearchForm} onSubmit={handleSearchSubmit} role="search">
        <input
          type="search"
          className={headerStyles.mobileSearchInput}
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
        <button type="submit" className={headerStyles.mobileSearchSubmit} aria-label="Искать">
          <MagnifyingGlassIcon className={headerStyles.mobileSearchIcon} />
        </button>
      </form>

      {(showDropdown || showEmpty) && (
        <ul
          id={listId}
          className={headerStyles.mobileSuggestionsList}
          role="listbox"
          aria-label="Подсказки товаров"
          onMouseDown={cancelBlurClose}
        >
          {loadingSug && (
            <li className={headerStyles.mobileSuggestionsLoading} role="presentation">
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
                  className={headerStyles.mobileSuggestionItem}
                  data-active={highlight === index ? 'true' : 'false'}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    cancelBlurClose();
                  }}
                  onClick={() => pickSuggestion(s)}
                  onMouseEnter={() => setHighlight(index)}
                >
                  {s.imageUrl ? (
                    <img
                      className={headerStyles.mobileSuggestionThumb}
                      src={s.imageUrl}
                      alt=""
                      width={40}
                      height={40}
                    />
                  ) : (
                    <span className={headerStyles.mobileSuggestionThumb} aria-hidden />
                  )}
                  <span className={headerStyles.mobileSuggestionText}>
                    <span className={headerStyles.mobileSuggestionName}>{s.name}</span>
                    {s.sku ? (
                      <span className={headerStyles.mobileSuggestionMeta}>Арт. {s.sku}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          {!loadingSug && suggestions.length === 0 && (
            <li className={headerStyles.mobileSuggestionsLoading} role="presentation">
              Ничего не найдено
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function MobileSearchPlaceholder() {
  return (
    <div className={headerStyles.mobileSearchShell} aria-hidden>
      <div className={headerStyles.mobileSearchForm}>
        <input
          type="search"
          className={headerStyles.mobileSearchInput}
          placeholder="Поиск..."
          disabled
          readOnly
        />
        <span className={headerStyles.mobileSearchSubmit}>
          <MagnifyingGlassIcon className={headerStyles.mobileSearchIcon} />
        </span>
      </div>
    </div>
  );
}

export interface StickyHeaderProps {
  onNavigationClick?: (sectionName: string) => void;
}

function StickyHeaderChrome({
  onNavigationClick,
  catalogSearch,
}: StickyHeaderProps & { catalogSearch: CatalogHeaderSearchState | null }) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const scrolled = useHeaderScrolled(SCROLL_THRESHOLD);
  const router = useRouter();
  const { isAuthenticated, user } = useUserAuth();
  const { isDarkTheme, toggleTheme } = useTheme();
  const [headerAvatarLoadError, setHeaderAvatarLoadError] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setHeaderAvatarLoadError(false);
  }, [user?.avatar]);

  return (
    <header
      className={scrolled ? `${styles.header} ${styles.scrolled}` : styles.header}
      data-scrolled={scrolled ? 'true' : 'false'}
    >
      <div className={styles.toolbar}>
        <div className={styles.topBarWrap} aria-hidden={scrolled}>
          <TopBar catalogSearch={catalogSearch} />
        </div>

        <div className={styles.mainHeader}>
          <div className={styles.container}>
            <div className={styles.logoSection}>
              <Logo />
              <ActionButtons onMobileMenuOpen={() => setMobileMenuOpen(!mobileMenuOpen)} />
            </div>

            {isMounted && (
              <div className={headerStyles.mobileHeader}>
                <div className={headerStyles.mobileHeaderRow}>
                  <Logo />
                  <a
                    href={PHONE_LINK}
                    className={headerStyles.mobileHeaderIcon}
                    aria-label="Позвонить"
                  >
                    <PhoneIcon className={headerStyles.mobileHeaderIconSvg} />
                  </a>
                  <button
                    type="button"
                    className={headerStyles.mobileHeaderIcon}
                    onClick={toggleTheme}
                    aria-label={isDarkTheme ? 'Включить светлую тему' : 'Включить тёмную тему'}
                  >
                    {isDarkTheme ? (
                      <SunIcon className={headerStyles.mobileHeaderIconSvg} />
                    ) : (
                      <MoonIcon className={headerStyles.mobileHeaderIconSvg} />
                    )}
                  </button>
                  <Link
                    href={isAuthenticated ? '/profile' : '/login'}
                    className={headerStyles.mobileHeaderIcon}
                    aria-label="Личный кабинет"
                  >
                    {isAuthenticated && user ? (
                      user.avatar && !headerAvatarLoadError ? (
                        <img
                          src={getAvatarUrl(user.avatar) ?? ''}
                          alt=""
                          className={headerStyles.mobileHeaderProfileAvatar}
                          onError={() => setHeaderAvatarLoadError(true)}
                        />
                      ) : (
                        <span className={headerStyles.mobileHeaderProfileInitials}>
                          {getInitials(user.firstName, user.lastName, user.email)}
                        </span>
                      )
                    ) : (
                      <UserIcon className={headerStyles.mobileHeaderIconSvg} />
                    )}
                  </Link>
                  <button
                    type="button"
                    className={`${headerStyles.mobileHeaderIcon} ${headerStyles.mobileHeaderIconBurger} ${headerStyles.mobileHeaderIconBurgerHidden}`}
                    onClick={() => setMobileMenuOpen((prev) => !prev)}
                    aria-label="Открыть меню"
                  >
                    <Bars3Icon className={headerStyles.mobileHeaderIconSvg} />
                  </button>
                </div>
                <div className={headerStyles.mobileSearchRow}>
                  <button
                    type="button"
                    className={headerStyles.mobileBackButton}
                    onClick={() => router.back()}
                    aria-label="Назад"
                  >
                    <ArrowLeftIcon className={headerStyles.mobileBackIcon} />
                  </button>
                  {catalogSearch ? (
                    <StickyMobileCatalogSearch catalogSearch={catalogSearch} />
                  ) : (
                    <MobileSearchPlaceholder />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <Navigation
          onNavigationClick={onNavigationClick}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          glassNav={scrolled}
        />
      </div>
    </header>
  );
}

function StickyHeaderWithSearch(props: StickyHeaderProps) {
  const catalogSearch = useCatalogHeaderSearch();
  return <StickyHeaderChrome {...props} catalogSearch={catalogSearch} />;
}

export const StickyHeader: React.FC<StickyHeaderProps> = (props) => (
  <Suspense fallback={<StickyHeaderChrome {...props} catalogSearch={null} />}>
    <StickyHeaderWithSearch {...props} />
  </Suspense>
);
