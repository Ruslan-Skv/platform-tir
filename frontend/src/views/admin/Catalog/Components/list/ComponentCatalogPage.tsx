'use client';

import { ComponentCatalogPageView } from './ComponentCatalogPageView';
import { useComponentCatalogPage } from './hooks/useComponentCatalogPage';

export function ComponentCatalogPage() {
  const model = useComponentCatalogPage();
  return <ComponentCatalogPageView model={model} />;
}
