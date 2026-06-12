'use client';

import { PayrollPageView } from './PayrollPageView';
import { usePayrollPage } from './hooks/usePayrollPage';

export function PayrollPage() {
  const model = usePayrollPage();
  return <PayrollPageView model={model} />;
}
