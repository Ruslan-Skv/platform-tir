'use client';

import { CeilingsPriceListPageView } from './CeilingsPriceListPageView';
import { useCeilingsPriceListPage } from './hooks/useCeilingsPriceListPage';

export function ContractDocumentsCeilingsPriceListPage() {
  const model = useCeilingsPriceListPage();
  return <CeilingsPriceListPageView {...model} />;
}
