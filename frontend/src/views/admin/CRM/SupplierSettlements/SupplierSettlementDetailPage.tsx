'use client';

import { SupplierSettlementDetailPageView } from './SupplierSettlementDetailPageView';
import { useSupplierSettlementDetailPage } from './hooks/useSupplierSettlementDetailPage';

export type { SupplierSettlementRow } from './supplier-settlement-detail-page.types';

export function SupplierSettlementDetailPage() {
  const model = useSupplierSettlementDetailPage();
  return <SupplierSettlementDetailPageView model={model} />;
}
