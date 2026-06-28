'use client';

import { Suspense } from 'react';

import { LeadsInboxPage } from '@/views/admin/Leads/LeadsInboxPage';

export default function AdminLeadsPage() {
  return (
    <Suspense fallback={<p>Загрузка...</p>}>
      <LeadsInboxPage />
    </Suspense>
  );
}
