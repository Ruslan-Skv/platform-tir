'use client';

import type { ReactNode } from 'react';

import styles from './AdminFormMessage.module.css';

export type AdminFormMessageProps = {
  type: 'success' | 'error';
  children: ReactNode;
  className?: string;
};

export function AdminFormMessage({ type, children, className }: AdminFormMessageProps) {
  const typeClass = type === 'success' ? styles.success : styles.error;

  return (
    <div
      className={[styles.root, typeClass, className].filter(Boolean).join(' ')}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      {children}
    </div>
  );
}
