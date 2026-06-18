'use client';

import { Suspense } from 'react';

import { PageSuspenseFallback } from '@/shared/ui/PageSuspenseFallback';
import { RecruitmentBlankPage } from '@/views/admin/Recruitment/blank/RecruitmentBlankPage';

export default function AdminRecruitmentBlankPage() {
  return (
    <Suspense fallback={<PageSuspenseFallback message="Загрузка..." />}>
      <RecruitmentBlankPage />
    </Suspense>
  );
}
