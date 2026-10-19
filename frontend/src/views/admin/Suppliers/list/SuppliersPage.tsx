'use client';

import { SuppliersPageView } from './SuppliersPageView';
import { useSuppliersPage } from './hooks/useSuppliersPage';

export function SuppliersPage() {
  const model = useSuppliersPage();
  return <SuppliersPageView model={model} />;
}
