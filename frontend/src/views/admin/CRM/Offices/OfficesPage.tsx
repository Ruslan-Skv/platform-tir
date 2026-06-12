'use client';

import { OfficesPageView } from './OfficesPageView';
import { useOfficesPage } from './hooks/useOfficesPage';

export function OfficesPage() {
  const model = useOfficesPage();
  return <OfficesPageView model={model} />;
}
