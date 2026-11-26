'use client';

import { XMarkIcon } from '@heroicons/react/24/outline';

import { useMemo, useState } from 'react';

import type { InstallerMaster } from '@/shared/api/admin-crm';

import {
  PACKAGE_TAB_BTN,
  PACKAGE_TAB_BTN_PRIMARY,
  PACKAGE_TAB_BTN_SECONDARY,
  PACKAGE_TAB_FIELD,
  PACKAGE_TAB_FIELD_FILL,
  PACKAGE_TAB_FIELD_HINT,
} from '../../ui/packageTabClassNames';
import styles from './PackageInteractiveInstallerPicker.module.css';

export type PackageInteractiveInstallerPickerProps = {
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

export function PackageInteractiveInstallerPicker({
  allInstallers,
  emptyListHint,
  selectedInstallers,
  activeInstallerId,
  installerAssignedCounts,
  onAddInstaller,
  onRemoveInstaller,
  onActivateInstaller,
  formatInstallerGradeShort,
}: PackageInteractiveInstallerPickerProps) {
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
      <p className={PACKAGE_TAB_FIELD_HINT}>
        {emptyListHint ?? 'Список мастеров пуст. Добавьте мастеров в разделе CRM → Мастера.'}
      </p>
    );
  }

  return (
    <div className={styles.picker}>
      <div className={`${PACKAGE_TAB_FIELD} ${PACKAGE_TAB_FIELD_FILL} ${styles.addField}`}>
        <label htmlFor="package_interactive_installer_add">Добавить мастера на объект</label>
        <select
          id="package_interactive_installer_add"
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
        <div className={styles.installerList} role="list" aria-label="Мастера на объекте">
          {selectedInstallers.map((installer) => {
            const isActive = activeInstallerId === installer.id;
            const assignedCount = installerAssignedCounts.get(installer.id) ?? 0;
            return (
              <div key={installer.id} className={styles.installerChip} role="listitem">
                <button
                  type="button"
                  aria-pressed={isActive}
                  className={`${PACKAGE_TAB_BTN} ${styles.installerChipBtn} ${
                    isActive ? PACKAGE_TAB_BTN_PRIMARY : PACKAGE_TAB_BTN_SECONDARY
                  }`}
                  onClick={() => onActivateInstaller(installer.id)}
                  title="Сделать активным для назначения позиций"
                >
                  <span className={styles.installerChipName}>
                    {installer.fullName} ({formatInstallerGradeShort(installer.grade)})
                  </span>
                  <span
                    className={`${styles.assignedCount} ${
                      assignedCount === 0 ? styles.assignedCountZero : ''
                    }`}
                    title={
                      assignedCount === 0
                        ? 'Нет назначенных позиций'
                        : `Назначено позиций: ${assignedCount}`
                    }
                  >
                    {assignedCount}
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.removeBtn}
                  aria-label={`Убрать мастера ${installer.fullName}`}
                  title="Убрать мастера с объекта"
                  onClick={() => onRemoveInstaller(installer.id)}
                >
                  <XMarkIcon className={styles.removeIcon} aria-hidden />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className={PACKAGE_TAB_FIELD_HINT}>
          Выберите мастеров из списка — на объекте обычно 1–7 человек.
        </p>
      )}
    </div>
  );
}
