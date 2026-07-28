import { Suspense } from 'react';

import { PageSuspenseFallback } from '@/shared/ui/PageSuspenseFallback';
import { WorkDayRequestsPage } from '@/views/admin/CRM/WorkDayRequests/WorkDayRequestsPage';

export default function WorkDayRequestsRoutePage() {
  return (
    <Suspense fallback={<PageSuspenseFallback message="Загрузка..." />}>
      <WorkDayRequestsPage />
    </Suspense>
  );
}
