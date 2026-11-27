import type { RepairScheduleSalarySummary } from '@/shared/api/crm/admin-repair-schedules';

/** Переплата по з/п: выдано авансов больше полной з/п (процент выдачи > 100%). */
export function isSalaryOverpaid(salary: RepairScheduleSalarySummary | null | undefined): boolean {
  return (salary?.paidPercent ?? 0) > 100;
}
