'use client';

import { useParams } from 'next/navigation';

import { MeasurementFormPage } from '@/views/admin/CRM/Measurements';

export default function AdminMeasurementEditPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : undefined;

  return <MeasurementFormPage measurementId={id} />;
}
