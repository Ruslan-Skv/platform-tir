'use client';

import { XMarkIcon } from '@heroicons/react/24/outline';

import { useMemo, useState } from 'react';

import type { InstallerMaster } from '@/shared/api/admin-crm';

import styles from '../ContractDocuments.module.css';

export type RepairInteractiveInstallerPickerProps = {
  allInstallers: InstallerMaster[];
  /** Подсказка, если список мастеров для выбора пуст (например, по направлению). */
  emptyListHint?: string;
  selectedInstallers: InstallerMaster[];
  activeInstallerId: string;
  installerAssignedCounts: Map<string, number>;
  onAddInstaller: (installerId: string) => void;
  onRemoveInstaller: (installerId: string) => void;
  onActivateInstaller: (installerId: string) => void;
  formatInstallerGradeShort: (grade: string | null | undefined) => string;
};

export function RepairInteractiveInstallerPicker({
  allInstallers,
  emptyListHint,
  selectedInstallers,
  activeInstallerId,
  installerAssignedCounts,
  onAddInstaller,
  onRemoveInstaller,
  onActivateInstaller,
  formatInstallerGradeShort,
}: RepairInteractiveInstallerPickerProps) {
  const [pickerValue, setPickerValue] = useState('');

  const installersAvailableToAdd = useMemo(() => {
    const selectedIds = new Set(selectedInstallers.map((i) => i.id));
    return [...allInstallers]
      .filter((installer) => !selectedIds.has(installer.id))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ru'));
  }, [allInstallers, selectedInstallers]);

  const handlePickerChange = (installerId: string) => {
    if (!installerId) return;
    onAddInstaller(installerId);
    setPickerValue('');
  };

  if (allInstallers.length === 0) {
    return (
      <p className={styles.hint} style={{ margin: '6px 0 0' }}>
        {emptyListHint ?? 'Список мастеров пуст. Добавьте мастеров в разделе CRM → Мастера.'}
      </p>
    );
  }

  return (
    <div className={styles.interactiveInstallerPicker}>
      <div className={`${styles.field} ${styles.interactiveInstallerAddField}`}>
        <label htmlFor="repair_interactive_installer_add">Добавить мастера на объект</label>
        <select
          id="repair_interactive_installer_add"
          value={pickerValue}
          disabled={installersAvailableToAdd.length === 0}
          onChange={(e) => handlePickerChange(e.target.value)}
        >
          <option value="">
            {installersAvailableToAdd.length === 0
              ? 'Все мастера из списка уже добавлены'
              : 'Выберите мастера из списка…'}
          </option>
          {installersAvailableToAdd.map((installer) => (
            <option key={installer.id} value={installer.id}>
              {installer.fullName} ({formatInstallerGradeShort(installer.grade)})
            </option>
          ))}
        </select>
      </div>

      {selectedInstallers.length > 0 ? (
        <div className={styles.workCategoryButtons} role="list" aria-label="Мастера на объекте">
          {selectedInstallers.map((installer) => {
            const isActive = activeInstallerId === installer.id;
            const assignedCount = installerAssignedCounts.get(installer.id) ?? 0;
            const isMarked = assignedCount > 0;
            return (
              <div
                key={installer.id}
                className={`${styles.interactiveInstallerBadge} ${
                  isActive ? styles.interactiveInstallerBadgeActive : ''
                }`}
                role="listitem"
              >
                <button
                  type="button"
                  className={`${styles.workCategoryButton} ${
                    isMarked ? styles.workCategoryButtonMarked : ''
                  } ${isActive ? styles.workCategoryButtonActive : ''}`}
                  onClick={() => onActivateInstaller(installer.id)}
                  title="Сделать активным для назначения позиций"
                >
                  <span>
                    {installer.fullName} ({formatInstallerGradeShort(installer.grade)})
                  </span>
                  <span
                    className={`${styles.installerAssignedCountBadge} ${
                      assignedCount === 0 ? styles.installerAssignedCountBadgeZero : ''
                    }`}
                  >
                    {assignedCount}
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.interactiveInstallerRemoveBtn}
                  aria-label={`Убрать мастера ${installer.fullName}`}
                  title="Убрать мастера с объекта"
                  onClick={() => onRemoveInstaller(installer.id)}
                >
                  <XMarkIcon className={styles.interactiveInstallerRemoveIcon} aria-hidden />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className={styles.hint} style={{ margin: 0 }}>
          Выберите мастеров из списка — на объекте обычно 1–7 человек.
        </p>
      )}
    </div>
  );
}
