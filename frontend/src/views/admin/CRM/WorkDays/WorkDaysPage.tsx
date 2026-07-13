'use client';

import { WorkDaysPageView } from './WorkDaysPageView';
import { useWorkDaysPage } from './hooks/useWorkDaysPage';

export function WorkDaysPage() {
  const model = useWorkDaysPage();
  return <WorkDaysPageView model={model} />;
}
