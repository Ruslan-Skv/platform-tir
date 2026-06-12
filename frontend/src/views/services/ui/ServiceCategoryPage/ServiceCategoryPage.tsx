'use client';

import { ServiceCategoryPageView } from './ServiceCategoryPageView';
import { useServiceCategoryPage } from './hooks/useServiceCategoryPage';
import type { ServiceCategoryPageProps } from './service-category-page.types';

export function ServiceCategoryPage(props: ServiceCategoryPageProps) {
  const model = useServiceCategoryPage(props);
  return <ServiceCategoryPageView model={model} />;
}
