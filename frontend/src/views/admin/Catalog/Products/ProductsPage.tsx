'use client';

import { ProductsPageView } from './ProductsPageView';
import { useProductsPage } from './hooks/useProductsPage';

interface ProductsPageProps {
  categoryId?: string;
}

export function ProductsPage({ categoryId }: ProductsPageProps = {}) {
  const model = useProductsPage({ categoryId });
  return <ProductsPageView model={model} />;
}
