'use client';

import { ProductCreatePageView } from './ProductCreatePageView';
import { useProductCreatePage } from './useProductCreatePage';

interface ProductCreatePageProps {
  fromCategory?: string;
  categoryIdFromUrl?: string;
  copyFromProductId?: string | null;
  initialCopyData?: import('./copy-product-utils').CopiedProductData | null;
  copyError?: string | null;
  isCopyMode?: boolean;
}

export function ProductCreatePage(props: ProductCreatePageProps = {}) {
  const model = useProductCreatePage(props);
  return <ProductCreatePageView model={model} />;
}
