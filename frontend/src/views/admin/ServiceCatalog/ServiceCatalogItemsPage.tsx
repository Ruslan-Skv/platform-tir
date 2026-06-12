'use client';

import { ServiceCatalogItemsPageView } from './ServiceCatalogItemsPageView';
import { useServiceCatalogItemsPage } from './hooks/useServiceCatalogItemsPage';

export function ServiceCatalogItemsPage() {
  const model = useServiceCatalogItemsPage();
  return <ServiceCatalogItemsPageView model={model} />;
}
