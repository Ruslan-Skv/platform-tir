'use client';

import { useState } from 'react';

import type { WorkDayJournalRow } from '@/shared/api/admin-work-days';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';

import styles from './WorkDaysPage.module.css';
import type { WorkDaysPageModel } from './hooks/useWorkDaysPage';
import {
  formatWorkDayAbsenceInterval,
  formatWorkDayDate,
  formatWorkDayTime,
  isWorkDayDayOffRow,
  isWorkDaySyntheticRow,
  isWorkDayTruancyRow,
  workDayAbsenceMinutes,
  workDayRequestBadgeLabel,
  workDayRowClassName,
  workDayStatusLabel,
  workDayUserName,
} from './work-days-display.utils';

type WorkDaysPageViewProps = {
  model: WorkDaysPageModel;
};

function AbsenceCell({ row }: { row: WorkDayJournalRow }) {
  const absences = row.absences ?? [];
  const minutes = workDayAbsenceMinutes(row);
  if (absences.length === 0) return <>—</>;

  return (
    <div className={styles.absenceCell}>
      <span className={styles.absenceTotal}>{Math.round(minutes)} мин</span>
      <ul className={styles.absenceList}>
        {absences.map((a) => (
          <li key={a.id}>
            {formatWorkDayAbsenceInterval(a.startedAt, a.endedAt)}
            {a.reason ? ` · ${a.reason}` : ''}
            {!a.endedAt ? ' (сейчас)' : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RequestsCell({ row }: { row: WorkDayJournalRow }) {
  const requests = row.requests ?? [];
  if (requests.length === 0) return <>—</>;

  return (
    <div className={styles.requestBadges}>
      {requests.map((req) => (
        <span
          key={req.id}
          className={`${styles.requestBadge} ${
            req.status === 'APPROVED' ? styles.requestBadgeApproved : styles.requestBadgePending
          }`}
        >
          {workDayRequestBadgeLabel(req)}
        </span>
      ))}
    </div>
  );
}

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

  const [deleteTarget, setDeleteTarget] = useState<WorkDayJournalRow | null>(null);
  const colSpan = canDelete ? 11 : 10;

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
        {stats.dayOffs > 0 ? <span>Согласованных выходных: {stats.dayOffs}</span> : null}
        {stats.dayOffsBySchedule > 0 ? (
          <span>Выходных по графику: {stats.dayOffsBySchedule}</span>
        ) : null}
        {stats.dayOffWork > 0 ? <span>Работа в выходной: {stats.dayOffWork}</span> : null}
        {stats.truancy > 0 ? <span>Прогулов: {stats.truancy}</span> : null}
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
                <th>Запросы</th>
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
                rows.map((row) =>
                  isWorkDayTruancyRow(row) ? (
                    <tr key={row.id} className={workDayRowClassName(row, styles)}>
                      <td>{formatWorkDayDate(row.workDate)}</td>
                      <td>{workDayUserName(row)}</td>
                      <td>{row.office?.name ?? '—'}</td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                      <td>
                        <RequestsCell row={row} />
                      </td>
                      <td>
                        <span className={styles.truancyBadge}>Прогул</span>
                      </td>
                      {canDelete ? <td className={styles.actionsCol} /> : null}
                    </tr>
                  ) : isWorkDayDayOffRow(row) ? (
                    <tr key={row.id} className={workDayRowClassName(row, styles)}>
                      <td>{formatWorkDayDate(row.workDate)}</td>
                      <td>{workDayUserName(row)}</td>
                      <td>{row.office?.name ?? '—'}</td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                      <td>
                        <RequestsCell row={row} />
                      </td>
                      <td>Выходной</td>
                      {canDelete ? <td className={styles.actionsCol} /> : null}
                    </tr>
                  ) : (
                    <tr key={row.id} className={workDayRowClassName(row, styles)}>
                      <td>{formatWorkDayDate(row.workDate)}</td>
                      <td>{workDayUserName(row)}</td>
                      <td>{row.office?.name ?? '—'}</td>
                      <td>{formatWorkDayTime(row.startedAt)}</td>
                      <td>{row.endedAt ? formatWorkDayTime(row.endedAt) : '—'}</td>
                      <td>{row.lateMinutes > 0 ? `${row.lateMinutes} мин` : '—'}</td>
                      <td>{row.earlyLeaveMinutes > 0 ? `${row.earlyLeaveMinutes} мин` : '—'}</td>
                      <td>
                        <AbsenceCell row={row} />
                      </td>
                      <td>
                        <RequestsCell row={row} />
                      </td>
                      <td>
                        <div className={styles.statusCell}>
                          <span>{workDayStatusLabel(row.status)}</span>
                          {row.isDayOffWork ? (
                            <span className={styles.dayOffWorkBadge}>Работа в выходной</span>
                          ) : null}
                        </div>
                      </td>
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
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && !isWorkDaySyntheticRow(deleteTarget) ? (
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
