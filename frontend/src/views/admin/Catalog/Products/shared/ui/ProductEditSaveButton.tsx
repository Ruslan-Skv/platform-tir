'use client';

import type { RefObject } from 'react';

import { AdminSaveButton } from '@/views/admin/ui/AdminStickySaveButton';

type ProductEditSaveButtonProps = {
  buttonRef: RefObject<HTMLButtonElement | null>;
  saving: boolean;
  fixed: boolean;
  fixedLeft: number | null;
  pinnedTopPx: number;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

/** @deprecated Use AdminSaveButton or AdminStickySaveButtonSlot from @/views/admin/ui/AdminStickySaveButton */
export function ProductEditSaveButton({
  buttonRef,
  saving,
  fixed,
  fixedLeft,
  pinnedTopPx,
  onClick,
}: ProductEditSaveButtonProps) {
  return (
    <AdminSaveButton
      buttonRef={buttonRef}
      saving={saving}
      label="Сохранить изменения"
      fixed={fixed}
      fixedLeft={fixedLeft}
      pinnedTopPx={pinnedTopPx}
      onClick={onClick}
    />
  );
}
