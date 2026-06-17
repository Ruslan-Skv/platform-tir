'use client';

import { Suspense } from 'react';

import { PageSuspenseFallback } from '@/shared/ui/PageSuspenseFallback';
import { KnowledgeTerritoryPage } from '@/views/admin/Knowledge';

export default function AdminKnowledgePage() {
  return (
    <Suspense fallback={<PageSuspenseFallback message="Загрузка..." />}>
      <KnowledgeTerritoryPage />
    </Suspense>
  );
}
