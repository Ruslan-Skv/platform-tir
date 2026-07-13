'use client';

import { useEffect, useMemo, useState } from 'react';

import { getOffices } from '@/shared/api/admin-crm';
import { type WorkDayRecord, getWorkDays } from '@/shared/api/admin-work-days';

import styles from './WorkDaysPage.module.css';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU');
}

function userName(row: WorkDayRecord): string {
  if (!row.user) return '—';
  const n = [row.user.lastName, row.user.firstName].filter(Boolean).join(' ');
  return n || row.user.email;
}

function absenceMinutes(row: WorkDayRecord): number {
  return (row.absences ?? []).reduce((sum, a) => {
    if (!a.endedAt) return sum;
    return sum + (new Date(a.endedAt).getTime() - new Date(a.startedAt).getTime()) / 60_000;
  }, 0);
}

export function WorkDaysPage() {
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const defaultTo = today.toISOString().slice(0, 10);

  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [officeId, setOfficeId] = useState('');
  const [rows, setRows] = useState<WorkDayRecord[]>([]);
  const [offices, setOffices] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getOffices(true)
      .then(setOffices)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void getWorkDays({
      dateFrom,
      dateTo,
      officeId: officeId || undefined,
    })
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка'))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo, officeId]);

  const stats = useMemo(() => {
    const late = rows.filter((r) => r.lateMinutes > 0).length;
    const early = rows.filter((r) => r.earlyLeaveMinutes > 0).length;
    const auto = rows.filter((r) => r.status === 'AUTO_CLOSED').length;
    return { late, early, auto };
  }, [rows]);

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
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className={styles.empty}>
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
                    <td>{userName(row)}</td>
                    <td>{row.office?.name ?? '—'}</td>
                    <td>{formatTime(row.startedAt)}</td>
                    <td>{row.endedAt ? formatTime(row.endedAt) : '—'}</td>
                    <td>{row.lateMinutes > 0 ? `${row.lateMinutes} мин` : '—'}</td>
                    <td>{row.earlyLeaveMinutes > 0 ? `${row.earlyLeaveMinutes} мин` : '—'}</td>
                    <td>
                      {absenceMinutes(row) > 0 ? `${Math.round(absenceMinutes(row))} мин` : '—'}
                    </td>
                    <td>
                      {row.status === 'AUTO_CLOSED'
                        ? 'Авто-закрыт'
                        : row.status === 'OPEN'
                          ? 'Открыт'
                          : 'Закрыт'}
                    </td>
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
