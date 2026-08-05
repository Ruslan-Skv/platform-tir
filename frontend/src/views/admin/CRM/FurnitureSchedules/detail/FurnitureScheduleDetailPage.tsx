'use client';

import { FurnitureScheduleDetailPageView } from './FurnitureScheduleDetailPageView';
import { useFurnitureScheduleDetailPage } from './hooks/useFurnitureScheduleDetailPage';

export function FurnitureScheduleDetailPage({ projectId }: { projectId: string }) {
  const model = useFurnitureScheduleDetailPage(projectId);
  return <FurnitureScheduleDetailPageView model={model} />;
}
