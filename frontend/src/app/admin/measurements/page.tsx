'use client';

import { Suspense } from 'react';

import { MeasurementsPage } from '@/views/admin/CRM/Measurements';

export default function AdminMeasurementsPage() {
  return (
    <Suspense fallback={null}>
      <MeasurementsPage />
    </Suspense>
  );
}
