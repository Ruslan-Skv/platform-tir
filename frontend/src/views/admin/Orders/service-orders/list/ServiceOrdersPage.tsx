'use client';

import { ServiceOrdersPageView } from './ServiceOrdersPageView';
import { useServiceOrdersPage } from './hooks/useServiceOrdersPage';

export function ServiceOrdersPage() {
  const model = useServiceOrdersPage();
  return <ServiceOrdersPageView model={model} />;
}
