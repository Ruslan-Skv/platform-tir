'use client';

import { Modal } from '@/shared/ui/Modal';
import { formatIasGradeShort } from '@/views/admin/CRM/InstallerAdvanceSheets/shared/installer-advance-sheets-page.constants';

import styles from './AdvanceSheetInstallerPickerModal.module.css';

/** Кандидат из прикреплённых к договору мастеров («Заказ-наряды»). */
export type AdvanceSheetInstallerOption = {
  id: string;
  fullName: string;
  grade?: string | null;
};

/**
 * Выбор мастера, для которого создаётся ведомость авансов по договору:
 * показывается, когда в «Заказ-нарядах» договора прикреплено несколько мастеров.
 */
export function AdvanceSheetInstallerPickerModal({
  isOpen,
  onClose,
  contractNumber,
  installers,
  onPick,
  onPickFromRegistry,
}: {
  isOpen: boolean;
  onClose: () => void;
  /** № договора — для контекста в вопросе. */
  contractNumber?: string | null;
  /** Прикреплённые к договору мастера. */
  installers: Array<AdvanceSheetInstallerOption>;
  /** Выбран конкретный мастер — открыть ведомость с предзаполнением. */
  onPick: (installerId: string) => void;
  /** Открыть ведомость без предзаполнения мастера (выбор в самой форме). */
  onPickFromRegistry: () => void;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Создать ведомость"
      size="sm"
      showCloseButton
      alignTop
    >
      <form data-modal-form data-modal-density="compact" onSubmit={(e) => e.preventDefault()}>
        <p data-modal-form-hint>
          К договору {contractNumber ? `№ ${contractNumber}` : 'без номера'} прикреплено несколько
          мастеров. Выберите, для какого мастера создать ведомость авансов.
        </p>

        <div className={styles.list}>
          {installers.map((master) => {
            const grade = formatIasGradeShort(master.grade);
            return (
              <button
                key={master.id}
                type="button"
                className={styles.pickBtn}
                onClick={() => onPick(master.id)}
              >
                <span className={styles.pickName}>{master.fullName}</span>
                {grade ? <span className={styles.pickGrade}>{grade}</span> : null}
              </button>
            );
          })}
        </div>

        <div data-modal-form-actions className={styles.actions}>
          <button type="button" data-modal-btn="secondary" onClick={onPickFromRegistry}>
            Выбрать из справочника
          </button>
          <button type="button" data-modal-btn="secondary" onClick={onClose}>
            Отмена
          </button>
        </div>
      </form>
    </Modal>
  );
}
