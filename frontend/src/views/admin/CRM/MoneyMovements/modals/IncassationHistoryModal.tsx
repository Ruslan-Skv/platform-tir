'use client';

import { useEffect, useState } from 'react';

import type {
  ManagerIncassation,
  ManagerIncassationUpdateParams,
} from '@/shared/api/crm/admin-money-movements';
import { Modal } from '@/shared/ui/Modal';

import styles from '../MoneyMovements.module.css';
import { formatDpDate, formatDpMoney, formatDpTime } from '../money-movements-page.constants';

type IncassationHistoryModalProps = {
  open: boolean;
  onClose: () => void;
  incassations: ManagerIncassation[];
  /** true — текущий пользователь супер-админ: доступны правка и аннулирование записей. */
  canManage: boolean;
  saving: boolean;
  onUpdate: (id: string, params: ManagerIncassationUpdateParams) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

/** История инкассаций менеджеров — открывается кнопкой-иконкой рядом с «+ Инкассация». */
export function IncassationHistoryModal({
  open,
  onClose,
  incassations,
  canManage,
  saving,
  onUpdate,
  onDelete,
}: IncassationHistoryModalProps) {
  // Правка строки (супер-админ): id записи и её редактируемые поля.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [incassator, setIncassator] = useState('');
  const [notes, setNotes] = useState('');
  // Аннулирование: id записи, ожидающей подтверждения.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Новое открытие модалки — чистое состояние правки.
  useEffect(() => {
    if (!open) return;
    setEditingId(null);
    setConfirmDeleteId(null);
    setError(null);
  }, [open]);

  const startEdit = (row: ManagerIncassation) => {
    setConfirmDeleteId(null);
    setError(null);
    setEditingId(row.id);
    setAmount(row.amount);
    setIncassator(row.incassator);
    setNotes(row.notes ?? '');
  };

  const submitEdit = async () => {
    if (!editingId) return;
    const amountNumber = Number(amount.replace(',', '.'));
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setError('Укажите сумму инкассации (положительное число)');
      return;
    }
    if (incassator.trim().length < 2) {
      setError('Укажите ФИО лица, производившего инкассацию');
      return;
    }
    setError(null);
    try {
      await onUpdate(editingId, {
        amount: amountNumber,
        incassator: incassator.trim(),
        notes: notes.trim(),
      });
      setEditingId(null);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Не удалось сохранить правку инкассации'
      );
    }
  };

  const submitDelete = async () => {
    if (!confirmDeleteId) return;
    setError(null);
    try {
      await onDelete(confirmDeleteId);
      setConfirmDeleteId(null);
      setEditingId(null);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : 'Не удалось аннулировать инкассацию'
      );
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="История инкассаций" size="lg">
      {incassations.length === 0 ? (
        <div className={styles.muted}>Инкассаций пока не было.</div>
      ) : (
        <div className={styles.incassationsTableWrap}>
          {error ? <p className={styles.incassationMismatch}>{error}</p> : null}
          <table className={styles.incassationsTable}>
            <thead>
              <tr>
                <th>Дата и время</th>
                <th>Менеджер</th>
                <th>Сумма</th>
                <th>ФИО инкассатора</th>
                <th>Примечание</th>
                {canManage ? <th>Действия</th> : null}
              </tr>
            </thead>
            <tbody>
              {incassations.map((row) =>
                editingId === row.id ? (
                  <tr key={row.id} className={styles.incassationEditingRow}>
                    <td className={styles.contractCell}>
                      {formatDpDate(row.performedAt)} {formatDpTime(row.performedAt)}
                    </td>
                    <td>
                      {row.manager?.name ?? '—'}
                      {row.submitter ? (
                        <span className={styles.muted}> (сдал: {row.submitter.name})</span>
                      ) : null}
                    </td>
                    <td>
                      <input
                        className={styles.incassationEditInput}
                        type="number"
                        min="0.01"
                        step="0.01"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={saving}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.incassationEditInput}
                        type="text"
                        value={incassator}
                        onChange={(e) => setIncassator(e.target.value)}
                        disabled={saving}
                        maxLength={500}
                      />
                    </td>
                    <td className={styles.incassationsNotes}>
                      <input
                        className={styles.incassationEditInput}
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        disabled={saving}
                        maxLength={1000}
                      />
                    </td>
                    <td className={styles.incassationRowActions}>
                      <button
                        type="button"
                        className={styles.incassationRowBtn}
                        onClick={() => void submitEdit()}
                        disabled={saving}
                      >
                        Сохранить
                      </button>
                      <button
                        type="button"
                        className={styles.incassationRowBtn}
                        onClick={() => setEditingId(null)}
                        disabled={saving}
                      >
                        Отмена
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={row.id}>
                    <td className={styles.contractCell}>
                      {formatDpDate(row.performedAt)} {formatDpTime(row.performedAt)}
                    </td>
                    <td>
                      {row.manager?.name ?? '—'}
                      {row.submitter ? (
                        <span className={styles.muted}> (сдал: {row.submitter.name})</span>
                      ) : null}
                    </td>
                    <td className={styles.incassationsAmount}>{formatDpMoney(row.amount)}</td>
                    <td>{row.incassator}</td>
                    <td className={styles.incassationsNotes}>{row.notes ?? '—'}</td>
                    {canManage ? (
                      <td className={styles.incassationRowActions}>
                        {confirmDeleteId === row.id ? (
                          <>
                            <span className={styles.incassationConfirmText}>Аннулировать?</span>
                            <button
                              type="button"
                              className={styles.incassationRowBtnDanger}
                              onClick={() => void submitDelete()}
                              disabled={saving}
                            >
                              Да
                            </button>
                            <button
                              type="button"
                              className={styles.incassationRowBtn}
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={saving}
                            >
                              Нет
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className={styles.incassationRowBtn}
                              onClick={() => startEdit(row)}
                              disabled={saving || confirmDeleteId !== null}
                            >
                              Изменить
                            </button>
                            <button
                              type="button"
                              className={styles.incassationRowBtnDanger}
                              onClick={() => setConfirmDeleteId(row.id)}
                              disabled={saving || editingId !== null}
                            >
                              Аннулировать
                            </button>
                          </>
                        )}
                      </td>
                    ) : null}
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
