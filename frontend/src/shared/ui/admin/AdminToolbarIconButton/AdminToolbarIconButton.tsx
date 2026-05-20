'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

import styles from './AdminToolbarIconButton.module.css';

export type AdminToolbarIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  /** Вращение иконки (например, при загрузке списка) */
  iconSpinning?: boolean;
};

export function AdminToolbarIconButton({
  children,
  className,
  iconSpinning = false,
  type = 'button',
  ...rest
}: AdminToolbarIconButtonProps) {
  return (
    <button type={type} className={[styles.button, className].filter(Boolean).join(' ')} {...rest}>
      <span className={iconSpinning ? styles.iconSpinning : undefined} aria-hidden>
        {children}
      </span>
    </button>
  );
}
