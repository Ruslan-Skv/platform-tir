'use client';

import { CategoryEditPageView } from './CategoryEditPageView';
import { useCategoryEditPage } from './hooks/useCategoryEditPage';

interface CategoryEditPageProps {
  categoryId: string;
}

export function CategoryEditPage({ categoryId }: CategoryEditPageProps) {
  const model = useCategoryEditPage({ categoryId });
  return <CategoryEditPageView model={model} />;
}
