'use client';

import { Modal } from '@/shared/ui/Modal/Modal';

import styles from './WorkDayEndSummaryModal.module.css';
import { buildWorkDayEndSummary } from './work-day-summary';

export interface WorkDayEndSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  displayName: string;
  lateMinutes: number;
  earlyLeaveMinutes: number;
}

export function WorkDayEndSummaryModal({
  isOpen,
  onClose,
  displayName,
  lateMinutes,
  earlyLeaveMinutes,
}: WorkDayEndSummaryModalProps) {
  const { lines, note } = buildWorkDayEndSummary(displayName, {
    lateMinutes,
    earlyLeaveMinutes,
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Рабочий день завершён"
      size="sm"
      showCloseButton={false}
    >
      <div className={styles.content}>
        <ul className={styles.lines}>
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {note ? <p className={styles.note}>{note}</p> : null}
        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={onClose}>
            Понятно
          </button>
        </div>
      </div>
    </Modal>
  );
}
