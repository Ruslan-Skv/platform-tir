'use client';

import { Suspense } from 'react';

import { PageSuspenseFallback } from '@/shared/ui/PageSuspenseFallback';
import { RecruitmentAnalyticsPage } from '@/views/admin/Recruitment/analytics/RecruitmentAnalyticsPage';

export default function AdminRecruitmentAnalyticsPage() {
  return (
    <Suspense fallback={<PageSuspenseFallback message="Загрузка..." />}>
      <RecruitmentAnalyticsPage />
    </Suspense>
  );
}
