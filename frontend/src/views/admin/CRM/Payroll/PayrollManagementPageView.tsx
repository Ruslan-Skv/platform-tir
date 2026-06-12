'use client';

import Link from 'next/link';

import styles from './PayrollManagementPage.module.css';
import { TABLE_HEADERS } from './hooks/payroll-management-page.constants';
import type { PayrollManagementPageModel } from './hooks/usePayrollManagementPage';

type PayrollManagementPageViewProps = {
  model: PayrollManagementPageModel;
};

export function PayrollManagementPageView({ model }: PayrollManagementPageViewProps) {
  const {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    prepaymentPct,
    setPrepaymentPct,
    rows,
    loading,
    error,
    loadContracts,
  } = model;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/admin/crm/payroll" className={styles.backLink}>
            ← Расчёт з/п
          </Link>
          <h1 className={styles.title}>Управление</h1>
        </div>
      </header>

      <div className={styles.filters}>
        <label className={styles.filterLabel}>
          Период с
          <input
            type="date"
            className={styles.filterDateInput}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="Дата начала периода"
          />
        </label>
        <label className={styles.filterLabel}>
          по
          <input
            type="date"
            className={styles.filterDateInput}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="Дата окончания периода"
          />
        </label>
        <label className={styles.filterLabel}>
          Предоплата:
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            placeholder="%"
            className={styles.filterNumberInput}
            value={prepaymentPct}
            onChange={(e) => setPrepaymentPct(e.target.value.replace(',', '.'))}
            aria-label="Размер предоплаты в процентах"
          />
          <span className={styles.filterUnit}>%</span>
        </label>
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={loadContracts}
          disabled={loading}
        >
          {loading ? 'Загрузка…' : 'Обновить'}
        </button>
      </div>

      {error && (
        <div className={styles.messageError} role="alert">
          {error}
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {TABLE_HEADERS.map((col) => (
                <th key={col.key} style={{ minWidth: col.width }}>
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={TABLE_HEADERS.length} className={styles.emptyCell}>
                  Загрузка…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={TABLE_HEADERS.length} className={styles.emptyCell}>
                  Нет договоров за выбранный период.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={idx}>
                  {TABLE_HEADERS.map((col) => (
                    <td key={col.key}>{row[col.key] ?? '—'}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
