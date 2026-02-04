'use client';

import React from 'react';

import { useTheme } from '@/features/theme';

import styles from './Background.module.css';

export const Background: React.FC = () => {
  const { isDarkTheme } = useTheme();

  // Для светлой темы — отдельная картинка, для тёмной — dark-fon.jpg
  const backgroundImage = isDarkTheme
    ? "url('/images/dark-fon.jpg')"
    : "url('/images/light-fon.png')";

  return (
    <div
      className={styles.background}
      style={{ backgroundImage }}
      data-theme={isDarkTheme ? 'dark' : 'light'}
      suppressHydrationWarning
    />
  );
};
