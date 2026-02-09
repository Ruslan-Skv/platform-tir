import { configureStore } from '@reduxjs/toolkit';

import { themeReducer } from '@/features/theme';

export const makeStore = () => {
  return configureStore({
    reducer: {
      theme: themeReducer,
    },
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

/** Один store на всё приложение (сайт + админка), чтобы тема и прочее работали везде */
let storeSingleton: AppStore | null = null;

export function getOrCreateStore(): AppStore {
  if (typeof window === 'undefined') {
    return makeStore();
  }
  if (!storeSingleton) {
    storeSingleton = makeStore();
  }
  return storeSingleton;
}
