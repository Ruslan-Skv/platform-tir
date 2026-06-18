'use client';

import { Suspense } from 'react';

import { PageSuspenseFallback } from '@/shared/ui/PageSuspenseFallback';
import { RecruitmentFormPage } from '@/views/admin/Recruitment/form/RecruitmentFormPage';

export default function AdminRecruitmentEditPage() {
  return (
    <Suspense fallback={<PageSuspenseFallback message="Загрузка..." />}>
      <RecruitmentFormPage />
    </Suspense>
  );
}
