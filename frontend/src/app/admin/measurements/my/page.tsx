'use client';

import { Suspense } from 'react';

import { MyMeasurementsPage } from '@/views/admin/CRM/Measurements';

export default function AdminMyMeasurementsPage() {
  return (
    <Suspense fallback={null}>
      <MyMeasurementsPage />
    </Suspense>
  );
}
