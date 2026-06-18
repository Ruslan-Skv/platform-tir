'use client';

import { Suspense } from 'react';

import { PageSuspenseFallback } from '@/shared/ui/PageSuspenseFallback';
import { RecruitmentListPage } from '@/views/admin/Recruitment';

export default function AdminRecruitmentPage() {
  return (
    <Suspense fallback={<PageSuspenseFallback message="Загрузка..." />}>
      <RecruitmentListPage />
    </Suspense>
  );
}
