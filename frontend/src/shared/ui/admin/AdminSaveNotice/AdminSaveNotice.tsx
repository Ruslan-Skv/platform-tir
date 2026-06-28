'use client';

import type { ReactNode } from 'react';

import styles from './AdminSaveNotice.module.css';

export type AdminSaveNoticeProps = {
  visible: boolean;
  children?: ReactNode;
  className?: string;
};

export function AdminSaveNotice({
  visible,
  children = 'Сохранено',
  className,
}: AdminSaveNoticeProps) {
  return (
    <span
      className={[styles.root, visible ? styles.visible : '', className].filter(Boolean).join(' ')}
      role="status"
      aria-live="polite"
    >
      {children}
    </span>
  );
}
