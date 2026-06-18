'use client';

import { RecruitmentListPageView } from './RecruitmentListPageView';
import { useRecruitmentListPage } from './hooks/useRecruitmentListPage';

export function RecruitmentListPage() {
  const model = useRecruitmentListPage();
  return <RecruitmentListPageView model={model} />;
}
