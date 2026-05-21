'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

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
 * Направление определяется по pathname + query и стеку (без popstate — в App Router он приходит позже).
 */
function buildHistoryKey(pathname: string, search: string): string {
  return search ? `${pathname}?${search}` : pathname;
}

export function useBrowserHistoryNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const historyKey = buildHistoryKey(pathname, searchParams.toString());

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

    if (index >= 0 && entries[index] === historyKey) {
      return;
    }

    if (index > 0 && entries[index - 1] === historyKey) {
      applyState({ entries, index: index - 1 });
      return;
    }

    if (index >= 0 && index < entries.length - 1 && entries[index + 1] === historyKey) {
      applyState({ entries, index: index + 1 });
      return;
    }

    const existingIndex = entries.indexOf(historyKey);
    if (existingIndex >= 0 && existingIndex !== index) {
      applyState({ entries, index: existingIndex });
      return;
    }

    if (index < 0) {
      applyState({ entries: [historyKey], index: 0 });
      return;
    }

    applyState({
      entries: [...entries.slice(0, index + 1), historyKey],
      index: index + 1,
    });
  }, [historyKey, applyState]);

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
