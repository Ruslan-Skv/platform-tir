'use client';

import { FurnitureProductFormPageView } from './FurnitureProductFormPageView';
import { useFurnitureProductFormPage } from './hooks/useFurnitureProductFormPage';

export function FurnitureProductFormPage({ productId }: { productId?: string }) {
  const model = useFurnitureProductFormPage(productId);
  return <FurnitureProductFormPageView model={model} />;
}
