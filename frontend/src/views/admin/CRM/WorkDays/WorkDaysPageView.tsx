'use client';

import { useState } from 'react';

import type { WorkDayRecord } from '@/shared/api/admin-work-days';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';

import styles from './WorkDaysPage.module.css';
import type { WorkDaysPageModel } from './hooks/useWorkDaysPage';
import {
  formatWorkDayDate,
  formatWorkDayTime,
  workDayAbsenceMinutes,
  workDayRowClassName,
  workDayStatusLabel,
  workDayUserName,
} from './work-days-display.utils';

type WorkDaysPageViewProps = {
  model: WorkDaysPageModel;
};

export function WorkDaysPageView({ model }: WorkDaysPageViewProps) {
  const {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    officeId,
    setOfficeId,
    rows,
    offices,
    loading,
    deletingId,
    canDelete,
    error,
    stats,
    handleDelete,
  } = model;

  const [deleteTarget, setDeleteTarget] = useState<WorkDayRecord | null>(null);
  const colSpan = canDelete ? 10 : 9;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Журнал сотрудников</h1>
        <p className={styles.subtitle}>Журнал рабочих дней всех сотрудников по офисам</p>
      </header>

      <div className={styles.filters}>
        <label>
          С
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label>
          По
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <label>
          Офис
          <select value={officeId} onChange={(e) => setOfficeId(e.target.value)}>
            <option value="">Все</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.stats}>
        <span>Опозданий: {stats.late}</span>
        <span>Ранних уходов: {stats.early}</span>
        <span>Авто-закрытий: {stats.auto}</span>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {loading ? <p>Загрузка…</p> : null}

      {!loading && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Сотрудник</th>
                <th>Офис</th>
                <th>Приход</th>
                <th>Уход</th>
                <th>Опозд.</th>
                <th>Ранний уход</th>
                <th>По делам</th>
                <th>Статус</th>
                {canDelete ? <th className={styles.actionsCol} /> : null}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className={styles.empty}>
                    Нет записей за выбранный период
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const absence = workDayAbsenceMinutes(row);
                  return (
                    <tr key={row.id} className={workDayRowClassName(row, styles)}>
                      <td>{formatWorkDayDate(row.workDate)}</td>
                      <td>{workDayUserName(row)}</td>
                      <td>{row.office?.name ?? '—'}</td>
                      <td>{formatWorkDayTime(row.startedAt)}</td>
                      <td>{row.endedAt ? formatWorkDayTime(row.endedAt) : '—'}</td>
                      <td>{row.lateMinutes > 0 ? `${row.lateMinutes} мин` : '—'}</td>
                      <td>{row.earlyLeaveMinutes > 0 ? `${row.earlyLeaveMinutes} мин` : '—'}</td>
                      <td>{absence > 0 ? `${Math.round(absence)} мин` : '—'}</td>
                      <td>{workDayStatusLabel(row.status)}</td>
                      {canDelete ? (
                        <td className={styles.actionsCol}>
                          <button
                            data-admin-mutation
                            type="button"
                            className={styles.iconDeleteButton}
                            disabled={deletingId === row.id}
                            title={deletingId === row.id ? 'Удаление…' : 'Удалить запись'}
                            aria-label={
                              deletingId === row.id ? 'Удаление…' : 'Удалить запись рабочего дня'
                            }
                            onClick={() => setDeleteTarget(row)}
                          >
                            <DeleteIcon size={16} tone="inherit" />
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget ? (
        <ConfirmModal
          isOpen
          title="Удалить запись рабочего дня?"
          message={`Запись «${workDayUserName(deleteTarget)}» за ${formatWorkDayDate(deleteTarget.workDate)} будет удалена без возможности восстановления. Она также исчезнет из журнала сотрудника.`}
          onConfirm={() => {
            const target = deleteTarget;
            setDeleteTarget(null);
            void handleDelete(target);
          }}
          onClose={() => setDeleteTarget(null)}
          confirmText={deletingId === deleteTarget.id ? 'Удаление…' : 'Удалить'}
          variant="danger"
        />
      ) : null}
    </div>
  );
}
