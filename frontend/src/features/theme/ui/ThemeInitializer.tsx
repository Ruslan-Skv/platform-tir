'use client';

import React, { useLayoutEffect } from 'react';

import { usePathname } from 'next/navigation';

import { useAppDispatch } from '@/shared/lib/redux/hooks';

import { initializeTheme, setTheme } from '../model/themeSlice';

interface ThemeInitializerProps {
  children: React.ReactNode;
}

export const ThemeInitializer: React.FC<ThemeInitializerProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const pathname = usePathname();

  // Синхронизируем тему с localStorage до первой отрисовки (избегаем мигания и hydration mismatch).
  // Начальное состояние в сторе всегда light; здесь восстанавливаем сохранённую тему.
  useLayoutEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    dispatch(setTheme(saved === 'dark'));
  }, [dispatch]);

  // При смене маршрута повторно применяем тему к document (на случай сброса при навигации).
  useLayoutEffect(() => {
    dispatch(initializeTheme());
  }, [dispatch, pathname]);

  return <>{children}</>;
};
