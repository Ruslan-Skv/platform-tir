'use client';

import { ProductEditPageView } from './ProductEditPageView';
import { useProductEditPage } from './useProductEditPage';

interface ProductEditPageProps {
  productId: string;
}

export function ProductEditPage({ productId }: ProductEditPageProps) {
  const model = useProductEditPage({ productId });
  return <ProductEditPageView model={model} />;
}
