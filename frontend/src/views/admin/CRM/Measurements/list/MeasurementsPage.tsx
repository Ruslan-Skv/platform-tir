'use client';

import { MeasurementsPageView } from './MeasurementsPageView';
import { useMeasurementsPage } from './hooks/useMeasurementsPage';

export function MeasurementsPage() {
  const model = useMeasurementsPage();
  return <MeasurementsPageView model={model} />;
}
