'use client';

import { MyRepairSchedulesPageView } from './MyRepairSchedulesPageView';
import { useMyRepairSchedulesPage } from './hooks/useMyRepairSchedulesPage';

export function MyRepairSchedulesPage() {
  const model = useMyRepairSchedulesPage();
  return <MyRepairSchedulesPageView model={model} />;
}
