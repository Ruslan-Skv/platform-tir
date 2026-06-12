'use client';

import { ServicesSectionPageView } from './ServicesSectionPageView';
import { useServicesSectionPage } from './hooks/useServicesSectionPage';

export function ServicesSectionPage() {
  const model = useServicesSectionPage();
  return <ServicesSectionPageView model={model} />;
}
