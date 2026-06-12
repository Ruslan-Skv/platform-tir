'use client';

import { toggleTheme } from '../model/themeSlice';
import { useAppDispatch, useAppSelector } from './redux/hooks';

export const useTheme = () => {
  const isDarkTheme = useAppSelector((state) => state.theme.isDarkTheme);
  const dispatch = useAppDispatch();

  return {
    isDarkTheme,
    toggleTheme: () => dispatch(toggleTheme()),
  };
};
