'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

import styles from './AdminTableIconButton.module.css';

export type AdminTableIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

/** Компактная кнопка с иконкой в таблицах админки (единая рамка и тёмная тема) */
export function AdminTableIconButton({
  children,
  className,
  type = 'button',
  ...rest
}: AdminTableIconButtonProps) {
  return (
    <button type={type} className={[styles.button, className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </button>
  );
}
