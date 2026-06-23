'use client';

import { AdminResourceEditGate } from '@/features/admin/components/AdminResourceEditGate';

import { ProductCreatePageView } from './ProductCreatePageView';
import { useProductCreatePage } from './useProductCreatePage';

const CATALOG_PRODUCTS_RESOURCE = 'admin.catalog.products';

interface ProductCreatePageProps {
  fromCategory?: string;
  categoryIdFromUrl?: string;
  copyFromProductId?: string | null;
  initialCopyData?: import('../shared/copy-product-utils').CopiedProductData | null;
  copyError?: string | null;
  isCopyMode?: boolean;
}

export function ProductCreatePage(props: ProductCreatePageProps = {}) {
  const model = useProductCreatePage(props);
  return (
    <AdminResourceEditGate
      resourceId={CATALOG_PRODUCTS_RESOURCE}
      redirectTo="/admin/catalog/products"
    >
      <ProductCreatePageView model={model} />
    </AdminResourceEditGate>
  );
}
