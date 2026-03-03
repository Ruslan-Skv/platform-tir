'use client';

import React, { useState } from 'react';

import Link from 'next/link';

import styles from './PayrollPage.module.css';

function getDefaultPeriod() {
  const now = new Date();
  return {
    month: String(now.getMonth() + 1).padStart(2, '0'),
    year: String(now.getFullYear()),
  };
}

const MONTHS = [
  { value: '01', label: 'Январь' },
  { value: '02', label: 'Февраль' },
  { value: '03', label: 'Март' },
  { value: '04', label: 'Апрель' },
  { value: '05', label: 'Май' },
  { value: '06', label: 'Июнь' },
  { value: '07', label: 'Июль' },
  { value: '08', label: 'Август' },
  { value: '09', label: 'Сентябрь' },
  { value: '10', label: 'Октябрь' },
  { value: '11', label: 'Ноябрь' },
  { value: '12', label: 'Декабрь' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

export function PayrollPage() {
  const [period, setPeriod] = useState(getDefaultPeriod);

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
