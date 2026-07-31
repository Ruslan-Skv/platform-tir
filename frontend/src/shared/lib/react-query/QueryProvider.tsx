'use client';

import { useEffect, useState } from 'react';

import { QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { isBrowserOnline, whenVisibleAndOnline } from '@/shared/lib/browser-network';

import { getQueryClient } from './query-client';

function bindReactQueryNetworkListeners(): () => void {
  let disposeOnline: (() => void) | undefined;
  let disposeFocus: (() => void) | undefined;

  onlineManager.setEventListener((setOnline) => {
    const sync = () => setOnline(isBrowserOnline());
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    sync();
    disposeOnline = () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
    return disposeOnline;
  });

  focusManager.setEventListener((handleFocus) => {
    let cancelled = false;

    const schedule = () => {
      void whenVisibleAndOnline(() => {
        if (!cancelled) handleFocus();
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') schedule();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', schedule);
    window.addEventListener('online', schedule);

    disposeFocus = () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', schedule);
      window.removeEventListener('online', schedule);
    };
    return disposeFocus;
  });

  return () => {
    disposeOnline?.();
    disposeFocus?.();
  };
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());

  useEffect(() => bindReactQueryNetworkListeners(), []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' ? (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      ) : null}
    </QueryClientProvider>
  );
}
