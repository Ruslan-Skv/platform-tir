import React from 'react';

import { Modal } from '../Modal';
import styles from './ConfirmModal.module.css';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'default';
  /** По умолчанию true — закрыть после onConfirm. false для асинхронных действий. */
  closeOnConfirm?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Подтверждение действия',
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  variant = 'default',
  closeOnConfirm = true,
}) => {
  const handleConfirm = () => {
    onConfirm();
    if (closeOnConfirm) onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm" showCloseButton={true}>
      <div className={styles.content}>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>
            {cancelText}
          </button>
          <button
            type="button"
            className={`${styles.confirmButton} ${styles[variant]}`}
            onClick={handleConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};
