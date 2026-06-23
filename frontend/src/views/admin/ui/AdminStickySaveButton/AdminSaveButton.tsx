'use client';

import type { Ref, RefObject } from 'react';

import { useAdminSectionCanEdit } from '@/features/admin/contexts/AdminSectionPermissionContext';

import styles from './AdminStickySaveButton.module.css';

type AdminSaveButtonProps = {
  buttonRef?: RefObject<HTMLElement | null>;
  saving: boolean;
  label: string;
  savingLabel?: string;
  fixed?: boolean;
  fixedLeft?: number | null;
  pinnedTopPx?: number;
  className?: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

export function AdminSaveButton({
  buttonRef,
  saving,
  label,
  savingLabel = 'Сохранение...',
  fixed = false,
  fixedLeft = null,
  pinnedTopPx,
  className,
  onClick,
}: AdminSaveButtonProps) {
  const { canEdit } = useAdminSectionCanEdit();
  const savingText = savingLabel;
  const idleText = label;

  if (!canEdit) {
    return null;
  }

  return (
    <button
      ref={buttonRef as Ref<HTMLButtonElement> | undefined}
      type="button"
      className={[
        styles.saveButton,
        styles.headerSaveButton,
        'admin-save-button',
        fixed ? styles.saveButtonFixed : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={fixed && fixedLeft != null ? { left: fixedLeft, top: pinnedTopPx } : undefined}
      disabled={saving}
      onClick={onClick}
    >
      <span className={styles.saveButtonTextWrap} aria-live="polite">
        <span>{saving ? savingText : idleText}</span>
        <span className={styles.saveButtonTextSizer} aria-hidden>
          {idleText}
        </span>
      </span>
    </button>
  );
}

export function AdminStickySaveButtonPlaceholder({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  return <span className={styles.saveButtonPlaceholder} style={{ width, height }} aria-hidden />;
}
