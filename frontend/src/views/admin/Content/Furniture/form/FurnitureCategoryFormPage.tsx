'use client';

import { FurnitureCategoryFormPageView } from './FurnitureCategoryFormPageView';
import { useFurnitureCategoryFormPage } from './hooks/useFurnitureCategoryFormPage';

export function FurnitureCategoryFormPage({ categoryId }: { categoryId?: string }) {
  const model = useFurnitureCategoryFormPage(categoryId);
  return <FurnitureCategoryFormPageView model={model} />;
}
