'use client';

import React, { useEffect } from 'react';

import { useAppDispatch } from '@/shared/lib/redux/hooks';

import { initializeTheme } from '../model/themeSlice';

interface ThemeInitializerProps {
  children: React.ReactNode;
}

export const ThemeInitializer: React.FC<ThemeInitializerProps> = ({ children }) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Инициализация темы только на клиенте
    dispatch(initializeTheme());
  }, [dispatch]);

  return <>{children}</>;
};
