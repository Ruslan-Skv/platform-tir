'use client';

import { TrashIcon } from '@heroicons/react/24/outline';

/** Единый размер иконки корзины в админ-тулбаре */
export const ADMIN_TOOLBAR_TRASH_ICON_SIZE = 18;

export function AdminTrashIcon() {
  return (
    <TrashIcon
      width={ADMIN_TOOLBAR_TRASH_ICON_SIZE}
      height={ADMIN_TOOLBAR_TRASH_ICON_SIZE}
      aria-hidden
    />
  );
}
