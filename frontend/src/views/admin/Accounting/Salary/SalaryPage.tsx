'use client';

import { SalaryPageView } from './SalaryPageView';
import { useSalaryPage } from './hooks/useSalaryPage';

/** Раздел «Расчёт з/п»: вкладки Расчёт за период / Договоры / Настройки (суперадмин). */
export function SalaryPage() {
  const model = useSalaryPage();
  return <SalaryPageView model={model} />;
}
