'use client';

import { SupplierDetailPageView } from './SupplierDetailPageView';
import { useSupplierDetailPage } from './hooks/useSupplierDetailPage';

export function SupplierDetailPage() {
  const model = useSupplierDetailPage();
  return <SupplierDetailPageView model={model} />;
}
