'use client';

import { SupplierSettlementsPageView } from './SupplierSettlementsPageView';
import { useSupplierSettlementsPage } from './hooks/useSupplierSettlementsPage';

export function SupplierSettlementsPage() {
  const model = useSupplierSettlementsPage();
  return <SupplierSettlementsPageView model={model} />;
}
