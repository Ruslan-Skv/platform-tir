'use client';

import type { ManagerIncassation } from '@/shared/api/crm/admin-money-movements';
import { Modal } from '@/shared/ui/Modal';

import styles from '../MoneyMovements.module.css';
import { formatDpDate, formatDpMoney, formatDpTime } from '../money-movements-page.constants';

type IncassationHistoryModalProps = {
  open: boolean;
  onClose: () => void;
  incassations: ManagerIncassation[];
};

/** История инкассаций менеджеров — открывается кнопкой-иконкой рядом с «+ Инкассация». */
export function IncassationHistoryModal({
  open,
  onClose,
  incassations,
}: IncassationHistoryModalProps) {
  return (
    <Modal isOpen={open} onClose={onClose} title="История инкассаций" size="lg">
      {incassations.length === 0 ? (
        <div className={styles.muted}>Инкассаций пока не было.</div>
      ) : (
        <table className={styles.incassationsTable}>
          <thead>
            <tr>
              <th>Дата и время</th>
              <th>Менеджер</th>
              <th>Сумма</th>
              <th>ФИО инкассатора</th>
              <th>Примечание</th>
            </tr>
          </thead>
          <tbody>
            {incassations.map((row) => (
              <tr key={row.id}>
                <td className={styles.contractCell}>
                  {formatDpDate(row.performedAt)} {formatDpTime(row.performedAt)}
                </td>
                <td>{row.manager?.name ?? '—'}</td>
                <td className={styles.incassationsAmount}>{formatDpMoney(row.amount)}</td>
                <td>{row.incassator}</td>
                <td className={styles.incassationsNotes}>{row.notes ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}
