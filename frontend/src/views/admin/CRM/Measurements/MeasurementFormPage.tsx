'use client';

import { MeasurementFormPageView } from './MeasurementFormPageView';
import { useMeasurementFormPage } from './hooks/useMeasurementFormPage';
import type { MeasurementFormPageProps } from './measurement-form-page.types';

export function MeasurementFormPage({ measurementId }: MeasurementFormPageProps) {
  const model = useMeasurementFormPage({ measurementId });
  return <MeasurementFormPageView model={model} />;
}
