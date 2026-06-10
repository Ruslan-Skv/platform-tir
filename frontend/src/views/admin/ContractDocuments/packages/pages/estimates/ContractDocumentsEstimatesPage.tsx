'use client';

import { EstimatesListLoadingState, EstimatesListPageView } from './list/EstimatesListPageView';
import { useEstimatesListPage } from './list/hooks/useEstimatesListPage';

export function ContractDocumentsEstimatesPage() {
  const page = useEstimatesListPage();

  if (page.load.loading) {
    return <EstimatesListLoadingState />;
  }

  return <EstimatesListPageView {...page} />;
}
