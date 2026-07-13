'use client';

import { useEffect, useState } from 'react';

import { useWorkDay } from '@/features/admin/work-day';
import {
  type MyWorkDayHistoryResponse,
  type WorkDayRecord,
  getMyWorkDayHistory,
} from '@/shared/api/admin-work-days';
import { WorkDaysIpHelp } from '@/views/admin/Settings/work-days/WorkDaysIpHelp';

import styles from '../WorkDays/WorkDaysPage.module.css';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU');
}

function absenceMinutes(row: WorkDayRecord): number {
  return (row.absences ?? []).reduce((sum, a) => {
    if (!a.endedAt) return sum;
    return sum + (new Date(a.endedAt).getTime() - new Date(a.startedAt).getTime()) / 60_000;
  }, 0);
}

function statusLabel(status: WorkDayRecord['status']): string {
  if (status === 'AUTO_CLOSED') return 'Авто-закрыт';
  if (status === 'OPEN') return 'Открыт';
  return 'Закрыт';
}

export function MyWorkDayPage() {
  const { status: liveStatus } = useWorkDay();
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const defaultTo = today.toISOString().slice(0, 10);

  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [data, setData] = useState<MyWorkDayHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void getMyWorkDayHistory({ dateFrom, dateTo })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка'))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  const rows = data?.records ?? [];
  const stats = data?.summary;

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
              На работе с {formatTime(todayDay.startedAt)}
              {liveStatus.hasOpenAbsence ? ' · сейчас по делам' : ''}
              {todayDay.lateMinutes > 0 ? ` · опоздание ${todayDay.lateMinutes} мин` : ''}
            </p>
          ) : todayDay && todayDay.status !== 'OPEN' ? (
            <p className={styles.todayText}>
              Рабочий день завершён: {formatTime(todayDay.startedAt)}
              {todayDay.endedAt ? ` — ${formatTime(todayDay.endedAt)}` : ''}
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
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className={
                      row.status === 'AUTO_CLOSED'
                        ? styles.rowAuto
                        : row.lateMinutes > 0
                          ? styles.rowLate
                          : undefined
                    }
                  >
                    <td>{formatDate(row.workDate)}</td>
                    <td>{row.office?.name ?? '—'}</td>
                    <td>{formatTime(row.startedAt)}</td>
                    <td>{row.endedAt ? formatTime(row.endedAt) : '—'}</td>
                    <td>{row.lateMinutes > 0 ? `${row.lateMinutes} мин` : '—'}</td>
                    <td>{row.earlyLeaveMinutes > 0 ? `${row.earlyLeaveMinutes} мин` : '—'}</td>
                    <td>
                      {absenceMinutes(row) > 0 ? `${Math.round(absenceMinutes(row))} мин` : '—'}
                    </td>
                    <td>{statusLabel(row.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
