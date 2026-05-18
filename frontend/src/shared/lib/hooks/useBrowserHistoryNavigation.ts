'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { usePathname, useRouter } from 'next/navigation';

type HistoryState = {
  entries: string[];
  index: number;
};

function getCanNavigate(state: HistoryState): { canGoBack: boolean; canGoForward: boolean } {
  return {
    canGoBack: state.index > 0,
    canGoForward: state.index < state.entries.length - 1,
  };
}

/**
 * Навигация назад/вперёд по истории внутри админки.
 * Направление определяется по pathname и стеку (без popstate — в App Router он приходит позже pathname).
 */
export function useBrowserHistoryNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  const historyRef = useRef<HistoryState>({ entries: [], index: -1 });
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  const applyState = useCallback((state: HistoryState) => {
    historyRef.current = state;
    const { canGoBack: back, canGoForward: forward } = getCanNavigate(state);
    setCanGoBack(back);
    setCanGoForward(forward);
  }, []);

  useEffect(() => {
    const { entries, index } = historyRef.current;

    if (index >= 0 && entries[index] === pathname) {
      return;
    }

    if (index > 0 && entries[index - 1] === pathname) {
      applyState({ entries, index: index - 1 });
      return;
    }

    if (index >= 0 && index < entries.length - 1 && entries[index + 1] === pathname) {
      applyState({ entries, index: index + 1 });
      return;
    }

    const existingIndex = entries.indexOf(pathname);
    if (existingIndex >= 0 && existingIndex !== index) {
      applyState({ entries, index: existingIndex });
      return;
    }

    if (index < 0) {
      applyState({ entries: [pathname], index: 0 });
      return;
    }

    applyState({
      entries: [...entries.slice(0, index + 1), pathname],
      index: index + 1,
    });
  }, [pathname, applyState]);

  const goBack = useCallback(() => {
    if (historyRef.current.index > 0) {
      router.back();
    }
  }, [router]);

  const goForward = useCallback(() => {
    const { index, entries } = historyRef.current;
    const nextPath = entries[index + 1];
    if (nextPath) {
      router.push(nextPath);
    }
  }, [router]);

  return { canGoBack, canGoForward, goBack, goForward };
}
