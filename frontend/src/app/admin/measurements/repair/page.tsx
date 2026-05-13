'use client';

import { Suspense } from 'react';

import { MeasurementsPage } from '@/views/admin/CRM/Measurements/MeasurementsPage';

export default function AdminRepairMeasurementsPage() {
  return (
    <Suspense fallback={null}>
      <MeasurementsPage />
    </Suspense>
  );
}
