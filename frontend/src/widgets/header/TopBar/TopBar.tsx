'use client';

import React from 'react';
import {
  HeartIcon,
  ShoppingCartIcon,
  UserIcon,
  SunIcon,
  MoonIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/features/theme';
import styles from './TopBar.module.css';

export const TopBar: React.FC = () => {
  const { isDarkTheme, toggleTheme } = useTheme();
  const router = useRouter();

  const handleSearchClick = () => {
    // Здесь будет логика открытия поиска
    console.log('Открыть поиск');
    // В будущем можно реализовать открытие модального окна поиска
  };

  const handleCompareClick = () => {
    router.push('/compare');
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
          {/* Поиск */}
          <button onClick={handleSearchClick} className={styles.utilityButton} type="button">
            <MagnifyingGlassIcon className={styles.icon} />
            <span className={styles.utilityText}>Поиск</span>
          </button>

          {/* Сравнение товаров */}
          <button onClick={handleCompareClick} className={styles.utilityButton} type="button">
            <ChartBarIcon className={styles.icon} />
            <span className={styles.utilityText}>Сравнение</span>
          </button>

          {/* Личный кабинет */}
          <button onClick={() => router.push('/profile')} className={styles.utilityButton} type="button">
            <UserIcon className={styles.icon} />
            <span className={styles.utilityText}>Кабинет</span>
          </button>

          {/* Избранное */}
          <button onClick={() => router.push('/favorites')} className={styles.utilityButton} type="button">
            <HeartIcon className={styles.icon} />
            <span className={styles.utilityText}>Избранное</span>
          </button>

          {/* Корзина */}
          <button onClick={() => router.push('/cart')} className={styles.utilityButton} type="button">
            <ShoppingCartIcon className={styles.icon} />
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
