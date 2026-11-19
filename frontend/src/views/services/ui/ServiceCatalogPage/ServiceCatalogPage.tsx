'use client';

import type { ServiceCatalogData } from '@/shared/api/service-catalog';

import { ServiceCatalogPageView } from './ServiceCatalogPageView';
import { useServiceCatalogPage } from './hooks/useServiceCatalogPage';

type ServiceCatalogPageProps = {
  initialData?: ServiceCatalogData | null;
};

export function ServiceCatalogPage({ initialData }: ServiceCatalogPageProps) {
  const model = useServiceCatalogPage(initialData);
  return <ServiceCatalogPageView model={model} />;
}
