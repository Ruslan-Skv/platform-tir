'use client';

import { CeilingFabricFormPageView } from './CeilingFabricFormPageView';
import { useCeilingFabricFormPage } from './hooks/useCeilingFabricFormPage';

export function CeilingFabricFormPage({ fabricId }: { fabricId?: string }) {
  const model = useCeilingFabricFormPage(fabricId);
  return <CeilingFabricFormPageView model={model} />;
}
