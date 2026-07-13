'use client';

import { WorkDaysIpHelp } from '@/features/admin/work-day/WorkDaysIpHelp';

import styles from '../WorkDays/WorkDaysPage.module.css';
import {
  formatWorkDayDate,
  formatWorkDayTime,
  workDayAbsenceMinutes,
  workDayRowClassName,
  workDayStatusLabel,
} from '../WorkDays/work-days-display.utils';
import type { MyWorkDayPageModel } from './hooks/useMyWorkDayPage';

type MyWorkDayPageViewProps = {
  model: MyWorkDayPageModel;
};

export function MyWorkDayPageView({ model }: MyWorkDayPageViewProps) {
  const { liveStatus, dateFrom, setDateFrom, dateTo, setDateTo, rows, stats, loading, error } =
    model;

  const todayDay = liveStatus?.todayWorkDay;
  const todayOpen = todayDay?.status === 'OPEN';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Мой рабочий день</h1>
        <p className={styles.subtitle}>Ваша статистика и журнал рабочих дней</p>
      </header>

      <WorkDaysIpHelp variant="compact" />

      {liveStatus?.tracked ? (
        <div className={styles.todayCard}>
          <h2 className={styles.todayTitle}>Сегодня</h2>
          {!liveStatus.isWorkDayToday ? (
            <p className={styles.todayText}>По графику сегодня нерабочий день.</p>
          ) : todayOpen ? (
            <p className={styles.todayText}>
              На работе с {formatWorkDayTime(todayDay.startedAt)}
              {liveStatus.hasOpenAbsence ? ' · сейчас по делам' : ''}
              {todayDay.lateMinutes > 0 ? ` · опоздание ${todayDay.lateMinutes} мин` : ''}
            </p>
          ) : todayDay && todayDay.status !== 'OPEN' ? (
            <p className={styles.todayText}>
              Рабочий день завершён: {formatWorkDayTime(todayDay.startedAt)}
              {todayDay.endedAt ? ` — ${formatWorkDayTime(todayDay.endedAt)}` : ''}
            </p>
          ) : (
            <p className={styles.todayText}>
              Рабочий день ещё не начат. Отметьте начало при входе в админку.
            </p>
          )}
        </div>
      ) : null}

      <div className={styles.filters}>
        <label>
          С
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label>
          По
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
      </div>

      {stats ? (
        <div className={styles.stats}>
          <span>Рабочих дней: {stats.totalDays}</span>
          <span>Опозданий: {stats.lateDays}</span>
          <span>Ранних уходов: {stats.earlyLeaveDays}</span>
          <span>Авто-закрытий: {stats.autoClosedDays}</span>
          <span>По делам (суммарно): {stats.totalAbsenceMinutes} мин</span>
        </div>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}
      {loading ? <p>Загрузка…</p> : null}

      {!loading && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Офис</th>
                <th>Приход</th>
                <th>Уход</th>
                <th>Опозд.</th>
                <th>Ранний уход</th>
                <th>По делам</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.empty}>
                    Нет записей за выбранный период
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const absence = workDayAbsenceMinutes(row);
                  return (
                    <tr key={row.id} className={workDayRowClassName(row, styles)}>
                      <td>{formatWorkDayDate(row.workDate)}</td>
                      <td>{row.office?.name ?? '—'}</td>
                      <td>{formatWorkDayTime(row.startedAt)}</td>
                      <td>{row.endedAt ? formatWorkDayTime(row.endedAt) : '—'}</td>
                      <td>{row.lateMinutes > 0 ? `${row.lateMinutes} мин` : '—'}</td>
                      <td>{row.earlyLeaveMinutes > 0 ? `${row.earlyLeaveMinutes} мин` : '—'}</td>
                      <td>{absence > 0 ? `${Math.round(absence)} мин` : '—'}</td>
                      <td>{workDayStatusLabel(row.status)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
