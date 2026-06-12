'use client';

import { ServiceCatalogSectionPageView } from './ServiceCatalogSectionPageView';
import { useServiceCatalogSectionPage } from './hooks/useServiceCatalogSectionPage';

export type {
  NewServiceCategoryForm,
  ServiceCatalogCategory,
  ServiceCatalogItem,
} from './service-catalog-section-page.types';

export function ServiceCatalogSectionPage() {
  const model = useServiceCatalogSectionPage();
  return <ServiceCatalogSectionPageView model={model} />;
}
