'use client';

import { use } from 'react';

import { FurnitureScheduleDetailPage } from '@/views/admin/CRM/FurnitureSchedules';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <FurnitureScheduleDetailPage projectId={id} />;
}
