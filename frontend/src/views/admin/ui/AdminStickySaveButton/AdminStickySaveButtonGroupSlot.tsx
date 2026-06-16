'use client';

import { createPortal } from 'react-dom';

import { AdminSaveButton, AdminStickySaveButtonPlaceholder } from './AdminSaveButton';
import styles from './AdminStickySaveButton.module.css';
import type { AdminStickySaveButtonState } from './useAdminStickySaveButton';

type AdminStickySaveButtonGroupItem = {
  label: string;
  savingLabel?: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

type AdminStickySaveButtonGroupSlotProps = {
  state: AdminStickySaveButtonState;
  saving: boolean;
  buttons: AdminStickySaveButtonGroupItem[];
};

export function AdminStickySaveButtonGroupSlot({
  state,
  saving,
  buttons,
}: AdminStickySaveButtonGroupSlotProps) {
  const {
    saveButtonAnchorRef,
    saveButtonRef,
    saveButtonFixed,
    saveButtonFixedLeft,
    saveButtonPlaceholderSize,
    saveButtonPinnedTopPx,
    saveButtonPortalRoot,
  } = state;

  const renderButtons = () => (
    <div
      ref={saveButtonRef as React.RefObject<HTMLDivElement | null>}
      className={saveButtonFixed ? styles.saveButtonGroupFixed : styles.saveButtonGroup}
      style={
        saveButtonFixed && saveButtonFixedLeft != null
          ? { left: saveButtonFixedLeft, top: saveButtonPinnedTopPx }
          : undefined
      }
    >
      {buttons.map((button) => (
        <AdminSaveButton
          key={button.label}
          saving={saving}
          label={button.label}
          savingLabel={button.savingLabel}
          onClick={button.onClick}
        />
      ))}
    </div>
  );

  return (
    <>
      <div ref={saveButtonAnchorRef} className={styles.saveButtonAnchor}>
        {saveButtonFixed && saveButtonPlaceholderSize ? (
          <AdminStickySaveButtonPlaceholder
            width={saveButtonPlaceholderSize.width}
            height={saveButtonPlaceholderSize.height}
          />
        ) : null}
        {!saveButtonFixed ? renderButtons() : null}
      </div>
      {saveButtonFixed && saveButtonPortalRoot
        ? createPortal(renderButtons(), saveButtonPortalRoot)
        : null}
    </>
  );
}
