'use client';

import { PayrollManagementPageView } from './PayrollManagementPageView';
import { usePayrollManagementPage } from './hooks/usePayrollManagementPage';

export function PayrollManagementPage() {
  const model = usePayrollManagementPage();
  return <PayrollManagementPageView model={model} />;
}
