'use client';

import { FurnitureSchedulesPageView } from './FurnitureSchedulesPageView';
import { useFurnitureSchedulesPage } from './hooks/useFurnitureSchedulesPage';

export function FurnitureSchedulesPage() {
  const model = useFurnitureSchedulesPage();
  return <FurnitureSchedulesPageView model={model} />;
}
