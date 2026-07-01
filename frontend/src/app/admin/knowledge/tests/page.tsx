'use client';

import { Suspense } from 'react';

import { KnowledgeCategoryTestsPage } from '@/views/admin/Knowledge/tests/KnowledgeCategoryTestsPage';

export default function AdminKnowledgeTestsPage() {
  return (
    <Suspense fallback={null}>
      <KnowledgeCategoryTestsPage />
    </Suspense>
  );
}
