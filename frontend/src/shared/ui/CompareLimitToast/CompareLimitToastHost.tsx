'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { COMPARE_LIMIT_MESSAGE } from '@/shared/api/compare';
import { subscribeCompareLimitExceeded } from '@/shared/lib/compare-limit-notify';

import styles from './CompareLimitToastHost.module.css';

const AUTO_DISMISS_MS = 5000;

export function CompareLimitToastHost() {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setOpen(false);
  }, []);

  useEffect(() => {
    return subscribeCompareLimitExceeded(() => {
      if (timeoutRef.current != null) {
        clearTimeout(timeoutRef.current);
      }
      setOpen(true);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        setOpen(false);
      }, AUTO_DISMISS_MS);
    });
  }, []);

  useEffect(
    () => () => {
      if (timeoutRef.current != null) {
        clearTimeout(timeoutRef.current);
      }
    },
    []
  );

  if (!open) {
    return null;
  }

  return (
    <div className={styles.toast} role="alert" aria-live="polite">
      <span className={styles.icon} aria-hidden>
        !
      </span>
      <span className={styles.text}>{COMPARE_LIMIT_MESSAGE}</span>
      <button type="button" className={styles.close} onClick={close} aria-label="Закрыть">
        ×
      </button>
    </div>
  );
}
