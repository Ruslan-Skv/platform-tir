'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Modal } from '@/shared/ui/Modal';
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';

import { AdminProfileForm } from './AdminProfileForm';
import styles from './AdminProfileModal.module.css';

type AdminProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const SAVE_NOTICE_MS = 3000;

export function AdminProfileModal({ isOpen, onClose }: AdminProfileModalProps) {
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSaveSuccess = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    setSaveSuccessVisible(false);
  }, []);

  const showSaveSuccess = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setSaveSuccessVisible(true);
    saveTimeoutRef.current = setTimeout(() => {
      setSaveSuccessVisible(false);
      saveTimeoutRef.current = null;
    }, SAVE_NOTICE_MS);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      clearSaveSuccess();
    }
  }, [isOpen, clearSaveSuccess]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleClose = () => {
    clearSaveSuccess();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Профиль"
      titleAside={<AdminSaveNotice visible={saveSuccessVisible}>Сохранено</AdminSaveNotice>}
      size="lg"
      className={styles.modalPanel}
      showCloseButton
    >
      {isOpen ? (
        <AdminProfileForm
          onClose={handleClose}
          onSaved={showSaveSuccess}
          clearSaveSuccess={clearSaveSuccess}
          saveSuccessVisible={saveSuccessVisible}
        />
      ) : null}
    </Modal>
  );
}
