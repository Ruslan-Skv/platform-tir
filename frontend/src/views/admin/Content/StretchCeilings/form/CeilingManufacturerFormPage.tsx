'use client';

import { CeilingManufacturerFormPageView } from './CeilingManufacturerFormPageView';
import { useCeilingManufacturerFormPage } from './hooks/useCeilingManufacturerFormPage';

export function CeilingManufacturerFormPage({ manufacturerId }: { manufacturerId?: string }) {
  const model = useCeilingManufacturerFormPage(manufacturerId);
  return <CeilingManufacturerFormPageView model={model} />;
}
