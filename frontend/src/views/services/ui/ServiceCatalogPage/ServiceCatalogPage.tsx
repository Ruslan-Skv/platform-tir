'use client';

import { ServiceCatalogPageView } from './ServiceCatalogPageView';
import { useServiceCatalogPage } from './hooks/useServiceCatalogPage';

export function ServiceCatalogPage() {
  const model = useServiceCatalogPage();
  return <ServiceCatalogPageView model={model} />;
}
