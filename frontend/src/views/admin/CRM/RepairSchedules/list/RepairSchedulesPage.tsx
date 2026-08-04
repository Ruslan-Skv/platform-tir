'use client';

import { RepairSchedulesPageView } from './RepairSchedulesPageView';
import { useRepairSchedulesPage } from './hooks/useRepairSchedulesPage';

export function RepairSchedulesPage() {
  const model = useRepairSchedulesPage();
  return <RepairSchedulesPageView model={model} />;
}
