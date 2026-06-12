'use client';

import { ContractPaymentsPageView } from './ContractPaymentsPageView';
import { useContractPaymentsPage } from './hooks/useContractPaymentsPage';

export function ContractPaymentsPage() {
  const model = useContractPaymentsPage();
  return <ContractPaymentsPageView model={model} />;
}
