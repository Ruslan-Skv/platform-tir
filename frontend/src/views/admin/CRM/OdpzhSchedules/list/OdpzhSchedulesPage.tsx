'use client';

import { OdpzhSchedulesPageView } from './OdpzhSchedulesPageView';
import { useOdpzhSchedulesPage } from './hooks/useOdpzhSchedulesPage';

export function OdpzhSchedulesPage() {
  const model = useOdpzhSchedulesPage();
  return <OdpzhSchedulesPageView model={model} />;
}
