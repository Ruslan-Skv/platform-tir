'use client';

import {
  ArrowLeftIcon,
  Bars3Icon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  PhoneIcon,
  SunIcon,
} from '@heroicons/react/24/outline';

import React, { Suspense, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useUserAuth } from '@/features/auth/context/UserAuthContext';
import { useTheme } from '@/features/theme';
import { Logo } from '@/shared/ui/Logo';
import { useChatSupportOpen } from '@/widgets/chat-support';

import { ActionButtons } from '../ActionButtons';
import { Navigation } from '../Navigation';
import { TopBar } from '../TopBar';
import { type CatalogHeaderSearchState, useCatalogHeaderSearch } from '../useCatalogHeaderSearch';
import styles from './Header.module.css';

const PHONE_LINK = 'tel:+78152601270';

function HeaderMobileCatalogSearch({ catalogSearch }: { catalogSearch: CatalogHeaderSearchState }) {
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
    <div className={styles.mobileSearchShell}>
      <form className={styles.mobileSearchForm} onSubmit={handleSearchSubmit} role="search">
        <input
          type="search"
          className={styles.mobileSearchInput}
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
        <button type="submit" className={styles.mobileSearchSubmit} aria-label="Искать">
          <MagnifyingGlassIcon className={styles.mobileSearchIcon} />
        </button>
      </form>

      {(showDropdown || showEmpty) && (
        <ul
          id={listId}
          className={styles.mobileSuggestionsList}
          role="listbox"
          aria-label="Подсказки товаров"
          onMouseDown={cancelBlurClose}
        >
          {loadingSug && (
            <li className={styles.mobileSuggestionsLoading} role="presentation">
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
                  className={styles.mobileSuggestionItem}
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
                      className={styles.mobileSuggestionThumb}
                      src={s.imageUrl}
                      alt=""
                      width={40}
                      height={40}
                    />
                  ) : (
                    <span className={styles.mobileSuggestionThumb} aria-hidden />
                  )}
                  <span className={styles.mobileSuggestionText}>
                    <span className={styles.mobileSuggestionName}>{s.name}</span>
                    {s.sku ? (
                      <span className={styles.mobileSuggestionMeta}>Арт. {s.sku}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          {!loadingSug && suggestions.length === 0 && (
            <li className={styles.mobileSuggestionsLoading} role="presentation">
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
    <div className={styles.mobileSearchShell} aria-hidden>
      <div className={styles.mobileSearchForm}>
        <input
          type="search"
          className={styles.mobileSearchInput}
          placeholder="Поиск..."
          disabled
          readOnly
        />
        <span className={styles.mobileSearchSubmit}>
          <MagnifyingGlassIcon className={styles.mobileSearchIcon} />
        </span>
      </div>
    </div>
  );
}

export interface HeaderProps {
  onNavigationClick?: (sectionName: string) => void;
}

function HeaderChrome({
  onNavigationClick,
  catalogSearch,
}: HeaderProps & { catalogSearch: CatalogHeaderSearchState | null }) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const chatSupport = useChatSupportOpen();
  const { isAuthenticated } = useUserAuth();
  const { isDarkTheme, toggleTheme } = useTheme();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <header className={styles.header}>
      <TopBar catalogSearch={catalogSearch} />

      <div className={styles.mainHeader}>
        <div className={styles.container}>
          <div className={styles.logoSection}>
            <Logo />
            <ActionButtons onMobileMenuOpen={() => setMobileMenuOpen(!mobileMenuOpen)} />
          </div>

          {isMounted && (
            <div className={styles.mobileHeader}>
              <div className={styles.mobileHeaderRow}>
                <Logo />
                <a href={PHONE_LINK} className={styles.mobileHeaderIcon} aria-label="Позвонить">
                  <PhoneIcon className={styles.mobileHeaderIconSvg} />
                </a>
                {isAuthenticated ? (
                  <button
                    type="button"
                    className={styles.mobileHeaderIcon}
                    onClick={() => chatSupport?.openChat()}
                    aria-label="Чат поддержки"
                  >
                    <ChatBubbleLeftRightIcon className={styles.mobileHeaderIconSvg} />
                  </button>
                ) : null}
                <button
                  type="button"
                  className={styles.mobileHeaderIcon}
                  onClick={toggleTheme}
                  aria-label={isDarkTheme ? 'Включить светлую тему' : 'Включить тёмную тему'}
                >
                  {isDarkTheme ? (
                    <SunIcon className={styles.mobileHeaderIconSvg} />
                  ) : (
                    <MoonIcon className={styles.mobileHeaderIconSvg} />
                  )}
                </button>
                <button
                  type="button"
                  className={`${styles.mobileHeaderIcon} ${styles.mobileHeaderIconBurger}`}
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  aria-label="Открыть меню"
                >
                  <Bars3Icon className={styles.mobileHeaderIconSvg} />
                </button>
              </div>
              <div className={styles.mobileSearchRow}>
                <button
                  type="button"
                  className={styles.mobileBackButton}
                  onClick={() => router.back()}
                  aria-label="Назад"
                >
                  <ArrowLeftIcon className={styles.mobileBackIcon} />
                </button>
                {catalogSearch ? (
                  <HeaderMobileCatalogSearch catalogSearch={catalogSearch} />
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
      />
    </header>
  );
}

function HeaderWithSearch(props: HeaderProps) {
  const catalogSearch = useCatalogHeaderSearch();
  return <HeaderChrome {...props} catalogSearch={catalogSearch} />;
}

export const Header: React.FC<HeaderProps> = (props) => (
  <Suspense fallback={<HeaderChrome {...props} catalogSearch={null} />}>
    <HeaderWithSearch {...props} />
  </Suspense>
);
