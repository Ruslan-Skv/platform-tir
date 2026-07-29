'use client';

import { useEffect, useRef, useState } from 'react';

// Длительность leave-транзишна у Modal: ~0.18s (+ немного на задержку рендера).
const CLOSE_ANIMATION_MS = 190;

/**
 * Унифицированный lifecycle для модалок из списка:
 * - keep mounted во время закрывающей анимации
 * - unmount только после неё, чтобы страница не "дёргалась"
 */
export function useListModalPresence(value: string | null) {
  const [mountedId, setMountedId] = useState<string | null>(value);
  const [open, setOpen] = useState<boolean>(Boolean(value));
  const closingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (value) {
      if (closingTimerRef.current) {
        window.clearTimeout(closingTimerRef.current);
        closingTimerRef.current = null;
      }
      setMountedId(value);
      setOpen(true);
      return;
    }

    if (!mountedId) return;
    setOpen(false);
    closingTimerRef.current = window.setTimeout(() => {
      setMountedId(null);
      closingTimerRef.current = null;
    }, CLOSE_ANIMATION_MS);
  }, [value, mountedId]);

  useEffect(
    () => () => {
      if (closingTimerRef.current) window.clearTimeout(closingTimerRef.current);
    },
    []
  );

  return { mountedId, open };
}
