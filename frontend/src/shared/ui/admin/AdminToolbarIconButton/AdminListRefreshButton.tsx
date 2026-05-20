'use client';

import type { AdminToolbarIconButtonProps } from './AdminToolbarIconButton';
import { AdminToolbarIconButton } from './AdminToolbarIconButton';

export type AdminListRefreshButtonProps = Omit<AdminToolbarIconButtonProps, 'children'> & {
  busy?: boolean;
};

function RefreshIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

export function AdminListRefreshButton({
  busy = false,
  disabled,
  title = 'Обновить список',
  'aria-label': ariaLabel,
  ...rest
}: AdminListRefreshButtonProps) {
  return (
    <AdminToolbarIconButton
      disabled={disabled}
      iconSpinning={busy}
      aria-busy={busy}
      aria-label={ariaLabel ?? (busy ? 'Обновление списка' : title)}
      title={title}
      {...rest}
    >
      <RefreshIcon />
    </AdminToolbarIconButton>
  );
}
