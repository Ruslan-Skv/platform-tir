'use client';

import type { RefObject } from 'react';

import styles from '../ProductEditPage.module.css';

type ProductEditSaveButtonProps = {
  buttonRef: RefObject<HTMLButtonElement | null>;
  saving: boolean;
  fixed: boolean;
  fixedLeft: number | null;
  pinnedTopPx: number;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

export function ProductEditSaveButton({
  buttonRef,
  saving,
  fixed,
  fixedLeft,
  pinnedTopPx,
  onClick,
}: ProductEditSaveButtonProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className={`${styles.saveButton} ${styles.headerSaveButton} ${fixed ? styles.saveButtonFixed : ''}`}
      style={fixed && fixedLeft != null ? { left: fixedLeft, top: pinnedTopPx } : undefined}
      disabled={saving}
      onClick={onClick}
    >
      <span className={styles.saveButtonTextWrap} aria-live="polite">
        <span>{saving ? 'Сохранение...' : 'Сохранить изменения'}</span>
        <span className={styles.saveButtonTextSizer} aria-hidden>
          Сохранить изменения
        </span>
      </span>
    </button>
  );
}
