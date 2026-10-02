'use client';

import { BankReconciliationPageView } from './BankReconciliationPageView';
import { useBankReconciliationPage } from './hooks/useBankReconciliationPage';

export function BankReconciliationPage() {
  const model = useBankReconciliationPage();
  return <BankReconciliationPageView model={model} />;
}
