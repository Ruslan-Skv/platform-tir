'use client';

import { RepairScheduleDetailPageView } from './RepairScheduleDetailPageView';
import { useRepairScheduleDetailPage } from './hooks/useRepairScheduleDetailPage';

export function RepairScheduleDetailPage({ projectId }: { projectId: string }) {
  const model = useRepairScheduleDetailPage(projectId);
  return <RepairScheduleDetailPageView model={model} />;
}
