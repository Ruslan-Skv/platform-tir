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

import React, { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useTheme } from '@/features/theme';
import { Logo } from '@/shared/ui/Logo';
import { useChatSupportOpen } from '@/widgets/chat-support';

import { ActionButtons } from '../ActionButtons';
import { Navigation } from '../Navigation';
import { TopBar } from '../TopBar';
import styles from './Header.module.css';

const PHONE_LINK = 'tel:+78152601270';

export interface HeaderProps {
  onNavigationClick?: (sectionName: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigationClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const chatSupport = useChatSupportOpen();
  const { isDarkTheme, toggleTheme } = useTheme();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleMobileSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = mobileSearchQuery.trim();
    if (q) {
      router.push(`/catalog/products?search=${encodeURIComponent(q)}`);
    } else {
      router.push('/catalog/products');
    }
  };

  return (
    <header className={styles.header}>
      <TopBar />

      <div className={styles.mainHeader}>
        <div className={styles.container}>
          {/* Десктоп: логотип и кнопки действий */}
          <div className={styles.logoSection}>
            <Logo />
            <ActionButtons onMobileMenuOpen={() => setMobileMenuOpen(!mobileMenuOpen)} />
          </div>

          {/* Мобильная шапка: рендерим только после монтирования, чтобы избежать hydration mismatch */}
          {isMounted && (
            <div className={styles.mobileHeader}>
              <div className={styles.mobileHeaderRow}>
                <Logo />
                <a href={PHONE_LINK} className={styles.mobileHeaderIcon} aria-label="Позвонить">
                  <PhoneIcon className={styles.mobileHeaderIconSvg} />
                </a>
                <button
                  type="button"
                  className={styles.mobileHeaderIcon}
                  onClick={() => chatSupport?.openChat()}
                  aria-label="Чат поддержки"
                >
                  <ChatBubbleLeftRightIcon className={styles.mobileHeaderIconSvg} />
                </button>
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
                <form
                  className={styles.mobileSearchForm}
                  onSubmit={handleMobileSearchSubmit}
                  role="search"
                >
                  <input
                    type="search"
                    className={styles.mobileSearchInput}
                    placeholder="Поиск..."
                    aria-label="Поиск"
                    value={mobileSearchQuery}
                    onChange={(e) => setMobileSearchQuery(e.target.value)}
                  />
                  <button type="submit" className={styles.mobileSearchSubmit} aria-label="Искать">
                    <MagnifyingGlassIcon className={styles.mobileSearchIcon} />
                  </button>
                </form>
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
};
