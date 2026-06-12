'use client';

import { CategoriesPageView } from './CategoriesPageView';
import { useCategoriesPage } from './hooks/useCategoriesPage';

export function CategoriesPage() {
  const model = useCategoriesPage();
  return <CategoriesPageView model={model} />;
}
