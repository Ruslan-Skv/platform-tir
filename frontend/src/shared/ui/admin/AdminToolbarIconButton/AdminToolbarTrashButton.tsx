'use client';

import type { AdminToolbarIconButtonProps } from './AdminToolbarIconButton';
import { AdminToolbarIconButton } from './AdminToolbarIconButton';
import styles from './AdminToolbarTrashButton.module.css';
import { AdminTrashIcon } from './AdminTrashIcon';

export type AdminToolbarTrashButtonProps = Omit<AdminToolbarIconButtonProps, 'children'> & {
  /** Число записей в корзине; при > 0 показывается бейдж */
  trashCount?: number;
};

function formatTrashBadgeCount(count: number): string {
  if (count > 99) return '99+';
  return String(count);
}

function trashAriaLabel(base: string, count: number): string {
  if (count <= 0) return base;
  const n = count > 99 ? 'более 99' : String(count);
  const word =
    count % 10 === 1 && count % 100 !== 11
      ? 'запись'
      : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)
        ? 'записи'
        : 'записей';
  return `${base}, в корзине ${n} ${word}`;
}

export function AdminToolbarTrashButton({
  trashCount = 0,
  title,
  'aria-label': ariaLabel,
  className,
  ...rest
}: AdminToolbarTrashButtonProps) {
  const hasTrash = trashCount > 0;
  const baseTitle = title ?? 'Корзина';
  const resolvedTitle = hasTrash
    ? `${baseTitle} (${trashCount > 99 ? '99+' : trashCount})`
    : baseTitle;
  const resolvedAriaLabel = trashAriaLabel(ariaLabel ?? baseTitle, trashCount);

  return (
    <span className={styles.wrap}>
      <AdminToolbarIconButton
        className={className}
        title={resolvedTitle}
        aria-label={resolvedAriaLabel}
        {...rest}
      >
        <AdminTrashIcon />
      </AdminToolbarIconButton>
      {hasTrash ? (
        <span className={styles.badge} aria-hidden>
          {formatTrashBadgeCount(trashCount)}
        </span>
      ) : null}
    </span>
  );
}
