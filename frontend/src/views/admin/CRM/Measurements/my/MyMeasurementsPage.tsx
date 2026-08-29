'use client';

import { MyMeasurementsPageView } from './MyMeasurementsPageView';
import { useMyMeasurementsPage } from './hooks/useMyMeasurementsPage';

export function MyMeasurementsPage() {
  const model = useMyMeasurementsPage();
  return <MyMeasurementsPageView model={model} />;
}
