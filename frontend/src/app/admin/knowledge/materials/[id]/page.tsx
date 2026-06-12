'use client';

import { use } from 'react';

import { KnowledgeMaterialViewPage } from '@/views/admin/Knowledge';

export default function AdminKnowledgeMaterialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <KnowledgeMaterialViewPage materialId={id} />;
}
