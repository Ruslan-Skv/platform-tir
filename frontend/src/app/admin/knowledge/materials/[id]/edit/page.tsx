'use client';

import { use } from 'react';

import { KnowledgeMaterialFormPage } from '@/views/admin/Knowledge/KnowledgeMaterialFormPage';

export default function AdminKnowledgeMaterialEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <KnowledgeMaterialFormPage materialId={id} />;
}
