'use client';

import Link from 'next/link';

import styles from './PayrollPage.module.css';
import { MONTHS, YEARS } from './hooks/payroll-page.constants';
import type { PayrollPageModel } from './hooks/usePayrollPage';

type PayrollPageViewProps = {
  model: PayrollPageModel;
};

export function PayrollPageView({ model }: PayrollPageViewProps) {
  const { period, setPeriod } = model;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Расчёт з/п</h1>
      </header>

      <div className={styles.filters}>
        <label className={styles.filterLabel}>
          Период
          <select
            className={styles.filterSelect}
            value={period.month}
            onChange={(e) => setPeriod((p) => ({ ...p, month: e.target.value }))}
            aria-label="Месяц"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.filterLabel}>
          Год
          <select
            className={styles.filterSelect}
            value={period.year}
            onChange={(e) => setPeriod((p) => ({ ...p, year: e.target.value }))}
            aria-label="Год"
          >
            {YEARS.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.placeholder}>
        <p className={styles.placeholderText}>
          Выберите период для расчёта заработной платы. Данные по сотрудникам и начислениям появятся
          здесь после подключения API.
        </p>
        <p className={styles.placeholderPeriod}>
          Период: {MONTHS.find((m) => m.value === period.month)?.label} {period.year}
        </p>
        <Link href="/admin/crm/payroll/management" className={styles.managementLink}>
          Перейти в раздел «Управление» →
        </Link>
      </div>
    </div>
  );
}
