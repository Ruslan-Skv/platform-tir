'use client';

import { useSearchParams } from 'next/navigation';

import { CategoriesPageView } from './CategoriesPageView';
import { useCategoriesPage } from './hooks/useCategoriesPage';

export function CategoriesPage() {
  const searchParams = useSearchParams();
  const initialEditCategoryId = searchParams.get('edit');
  const model = useCategoriesPage({ initialEditCategoryId });
  return <CategoriesPageView model={model} />;
}
