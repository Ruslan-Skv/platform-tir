'use client';

import { Bars3Icon } from '@heroicons/react/24/outline';

import React from 'react';

import { ActionButton } from '@/features/forms';
import { useFormContext } from '@/features/forms';

import styles from './ActionButtons.module.css';

export interface ActionButtonsProps {
  onMobileMenuOpen?: () => void;
  mobile?: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onMobileMenuOpen,
  mobile = false,
}) => {
  const { measurementModal, callbackModal } = useFormContext();

  if (mobile) {
    return (
      <div className={styles.mobileButtons}>
        <ActionButton variant="callback" onClick={callbackModal.open} mobile />
        <ActionButton variant="measurement" onClick={measurementModal.open} mobile />
      </div>
    );
  }

  return (
    <>
      <div className={styles.desktopButtons}>
        <ActionButton variant="callback" onClick={callbackModal.open} />
        <ActionButton variant="measurement" onClick={measurementModal.open} />
      </div>

      <div className={styles.mobileMenuButton}>
        <button
          type="button"
          className={styles.menuButton}
          onClick={onMobileMenuOpen}
          aria-label="Открыть меню"
        >
          <Bars3Icon className={styles.menuIcon} />
        </button>
      </div>
    </>
  );
};
