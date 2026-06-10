'use client';

import { ContractsListPageView } from './ContractsListPageView';
import { useContractsListPage } from './list/hooks/useContractsListPage';

export function ContractsListPage() {
  const page = useContractsListPage();
  return <ContractsListPageView {...page} />;
}
