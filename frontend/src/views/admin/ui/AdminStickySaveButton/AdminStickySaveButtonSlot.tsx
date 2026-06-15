'use client';

import { createPortal } from 'react-dom';

import { AdminSaveButton, AdminStickySaveButtonPlaceholder } from './AdminSaveButton';
import styles from './AdminStickySaveButton.module.css';
import type { AdminStickySaveButtonState } from './useAdminStickySaveButton';

type AdminStickySaveButtonSlotProps = {
  state: AdminStickySaveButtonState;
  saving: boolean;
  label: string;
  savingLabel?: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

export function AdminStickySaveButtonSlot({
  state,
  saving,
  label,
  savingLabel,
  onClick,
}: AdminStickySaveButtonSlotProps) {
  const {
    saveButtonAnchorRef,
    saveButtonRef,
    saveButtonFixed,
    saveButtonFixedLeft,
    saveButtonPlaceholderSize,
    saveButtonPinnedTopPx,
    saveButtonPortalRoot,
  } = state;

  return (
    <>
      <div ref={saveButtonAnchorRef} className={styles.saveButtonAnchor}>
        {saveButtonFixed && saveButtonPlaceholderSize ? (
          <AdminStickySaveButtonPlaceholder
            width={saveButtonPlaceholderSize.width}
            height={saveButtonPlaceholderSize.height}
          />
        ) : null}
        {!saveButtonFixed ? (
          <AdminSaveButton
            buttonRef={saveButtonRef}
            saving={saving}
            label={label}
            savingLabel={savingLabel}
            onClick={onClick}
          />
        ) : null}
      </div>
      {saveButtonFixed && saveButtonPortalRoot
        ? createPortal(
            <AdminSaveButton
              buttonRef={saveButtonRef}
              saving={saving}
              label={label}
              savingLabel={savingLabel}
              fixed
              fixedLeft={saveButtonFixedLeft}
              pinnedTopPx={saveButtonPinnedTopPx}
              onClick={onClick}
            />,
            saveButtonPortalRoot
          )
        : null}
    </>
  );
}
