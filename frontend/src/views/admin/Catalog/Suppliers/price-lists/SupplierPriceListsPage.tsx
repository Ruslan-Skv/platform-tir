'use client';

import { SupplierPriceListsPageView } from './SupplierPriceListsPageView';
import { useSupplierPriceListsPage } from './hooks/useSupplierPriceListsPage';

type SupplierPriceListsPageProps = {
  supplierId: string;
};

export function SupplierPriceListsPage({ supplierId }: SupplierPriceListsPageProps) {
  const model = useSupplierPriceListsPage({ supplierId });
  return <SupplierPriceListsPageView model={model} />;
}
