'use client';

import { CategoryAttributesPageView } from './CategoryAttributesPageView';
import type { CategoryAttributesPageProps } from './category-attributes-page.types';
import { useCategoryAttributesPage } from './hooks/useCategoryAttributesPage';

export function CategoryAttributesPage({ categoryId }: CategoryAttributesPageProps) {
  const model = useCategoryAttributesPage({ categoryId });
  return <CategoryAttributesPageView model={model} />;
}
