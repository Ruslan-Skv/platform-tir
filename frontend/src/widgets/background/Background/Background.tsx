'use client';

import React from 'react';

import { useTheme } from '@/features/theme';

import styles from './Background.module.css';

export const Background: React.FC = () => {
  const { isDarkTheme } = useTheme();

  // Для избежания mismatch, используем только темную тему на сервере
  // На клиенте тема определится корректно после гидрации
  // const backgroundImage = isDarkTheme ? "url('/images/dark-fon.jpg')" : "url('/images/fon.jpg')";
  const backgroundImage = "url('/images/dark-fon.jpg')";

  return (
    <div
      className={styles.background}
      style={{ backgroundImage }}
      data-theme={isDarkTheme ? 'dark' : 'light'}
      suppressHydrationWarning
    />
  );
};
