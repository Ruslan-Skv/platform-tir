import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import type { ThemeState } from '../types/theme';

// Всегда светлая тема в начальном состоянии, чтобы совпадал SSR и первый рендер на клиенте
// (избегаем hydration mismatch). Реальная тема из localStorage применяется в ThemeInitializer.
const initialState: ThemeState = {
  isDarkTheme: false,
};

// Функция для безопасного применения темы к DOM
const applyThemeToDOM = (isDark: boolean) => {
  if (typeof window === 'undefined') return;

  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
  }
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.isDarkTheme = !state.isDarkTheme;
      applyThemeToDOM(state.isDarkTheme);
    },
    setTheme: (state, action: PayloadAction<boolean>) => {
      state.isDarkTheme = action.payload;
      applyThemeToDOM(action.payload);
    },
    initializeTheme: (state) => {
      // На сервере ничего не делаем, на клиенте применяем текущую тему
      if (typeof window !== 'undefined') {
        applyThemeToDOM(state.isDarkTheme);
      }
    },
  },
});

export const { toggleTheme, setTheme, initializeTheme } = themeSlice.actions;
export default themeSlice.reducer;
