'use client';

import { ProductDetailPageView } from './ProductDetailPageView';
import { useProductDetailPage } from './hooks/useProductDetailPage';
import type { ProductDetailPageProps } from './product-detail-page.types';

export function ProductDetailPage({ slug }: ProductDetailPageProps) {
  const model = useProductDetailPage({ slug });
  return <ProductDetailPageView model={model} />;
}
