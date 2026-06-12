'use client';

import { SupplierEditPageView } from './SupplierEditPageView';
import { useSupplierEditPage } from './hooks/useSupplierEditPage';

interface SupplierEditPageProps {
  supplierId?: string;
}

export function SupplierEditPage({ supplierId }: SupplierEditPageProps) {
  const model = useSupplierEditPage({ supplierId });
  return <SupplierEditPageView model={model} />;
}
