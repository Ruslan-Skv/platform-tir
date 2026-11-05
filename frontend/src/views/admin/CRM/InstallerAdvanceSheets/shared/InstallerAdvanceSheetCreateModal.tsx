'use client';

import { useEffect, useState } from 'react';

import type { InstallerMaster } from '@/shared/api/admin-crm';
import { getInstallers } from '@/shared/api/admin-crm';
import {
  type InstallerAdvanceSheetCreateResult,
  type InstallerAdvanceSheetItemParams,
  createInstallerAdvanceSheet,
} from '@/shared/api/crm/admin-installer-advance-sheets';
import { Modal } from '@/shared/ui/Modal';

import { InstallerAdvanceSheetForm } from './InstallerAdvanceSheetForm';
import styles from './InstallerAdvanceSheets.module.css';

/**
 * Модалка создания ведомости авансов — форма бывшей страницы /new. Вызывается
 * с «Расчётников мастеров» (пустая) и из строк план-графика ремонта
 * (предзаполненные мастер + договор).
 */
export function InstallerAdvanceSheetCreateModal({
  isOpen,
  onClose,
  onCreated,
  installerId,
  items,
}: {
  isOpen: boolean;
  onClose: () => void;
  /** Успешное создание: модалка закрывается сама, вызывающий показывает уведомление. */
  onCreated?: (sheet: InstallerAdvanceSheetCreateResult) => void;
  /** Предзаполнение мастера (напр. мастер договора из план-графика). */
  installerId?: string;
  /** Предзаполненные строки договоров (суммы вводит пользователь). */
  items?: Array<{ packageId: string; label: string }>;
}) {
  const [installers, setInstallers] = useState<InstallerMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getInstallers()
      .then((registry) => {
        if (!cancelled) setInstallers(registry);
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : 'Не удалось загрузить справочник мастеров'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (values: {
    installerId: string;
    note?: string;
    items: InstallerAdvanceSheetItemParams[];
  }) => {
    setSubmitting(true);
    try {
      const created = await createInstallerAdvanceSheet(values);
      onCreated?.(created);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Новая ведомость авансов"
      size="lg"
      showCloseButton
      alignTop
    >
      {loadError ? (
        <p className={styles.panelError}>{loadError}</p>
      ) : (
        <InstallerAdvanceSheetForm
          mode="create"
          installers={installers}
          initialInstallerId={installerId}
          initialItems={items}
          submitting={submitting || loading}
          onSubmit={submit}
          onCancel={onClose}
        />
      )}
    </Modal>
  );
}
