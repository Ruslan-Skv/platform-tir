'use client';

import { RecruitmentAnalyticsPageView } from './RecruitmentAnalyticsPageView';
import { useRecruitmentAnalyticsPage } from './hooks/useRecruitmentAnalyticsPage';

export function RecruitmentAnalyticsPage() {
  const model = useRecruitmentAnalyticsPage();
  return <RecruitmentAnalyticsPageView model={model} />;
}
