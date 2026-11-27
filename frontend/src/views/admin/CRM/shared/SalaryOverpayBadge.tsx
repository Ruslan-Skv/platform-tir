'use client';

import type { RepairScheduleSalarySummary } from '@/shared/api/crm/admin-repair-schedules';

import styles from './salary-overpay-badge.module.css';
import { isSalaryOverpaid } from './salaryOverpay';

/**
 * Бейдж «переплата» в колонке «З/п» план-графиков: авансы превысили полную
 * з/п мастеров (выдано больше 100%). Без переплаты не рисуется.
 */
export function SalaryOverpayBadge({
  salary,
}: {
  salary: RepairScheduleSalarySummary | null | undefined;
}) {
  if (!isSalaryOverpaid(salary)) return null;
  return (
    <span className={styles.badge} title="Выдано авансов больше полной з/п мастеров">
      переплата
    </span>
  );
}
