'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_VISIBLE_MS = 3000;

export function useServiceCategoryModalSaveNotice(visibleMs = DEFAULT_VISIBLE_MS) {
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSaveSuccess = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setSaveSuccessVisible(false);
  }, []);

  const showSaveSuccess = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setSaveSuccessVisible(true);
    timeoutRef.current = setTimeout(() => {
      setSaveSuccessVisible(false);
      timeoutRef.current = null;
    }, visibleMs);
  }, [visibleMs]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { saveSuccessVisible, showSaveSuccess, clearSaveSuccess };
}
