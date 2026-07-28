'use client';

import { WorkDayRequestsPageView } from './WorkDayRequestsPageView';
import { useWorkDayRequestsPage } from './hooks/useWorkDayRequestsPage';

export function WorkDayRequestsPage() {
  const model = useWorkDayRequestsPage();
  return <WorkDayRequestsPageView model={model} />;
}
