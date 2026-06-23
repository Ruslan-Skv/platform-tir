'use client';

import { AdminResourceEditGate } from '@/features/admin/components/AdminResourceEditGate';

import { ProductEditPageView } from './ProductEditPageView';
import { useProductEditPage } from './useProductEditPage';

const CATALOG_PRODUCTS_RESOURCE = 'admin.catalog.products';

interface ProductEditPageProps {
  productId: string;
}

export function ProductEditPage({ productId }: ProductEditPageProps) {
  const model = useProductEditPage({ productId });
  return (
    <AdminResourceEditGate
      resourceId={CATALOG_PRODUCTS_RESOURCE}
      redirectTo="/admin/catalog/products"
    >
      <ProductEditPageView model={model} />
    </AdminResourceEditGate>
  );
}
