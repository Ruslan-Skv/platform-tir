'use client';

import { MySalaryPageView } from './MySalaryPageView';
import { useMySalaryPage } from './hooks/useMySalaryPage';

export function MySalaryPage() {
  const model = useMySalaryPage();
  return <MySalaryPageView model={model} />;
}
