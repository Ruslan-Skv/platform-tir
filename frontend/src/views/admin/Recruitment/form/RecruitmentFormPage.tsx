'use client';

import { RecruitmentFormPageView } from './RecruitmentFormPageView';
import { useRecruitmentFormPage } from './hooks/useRecruitmentFormPage';

export function RecruitmentFormPage() {
  const model = useRecruitmentFormPage();
  return <RecruitmentFormPageView model={model} />;
}
