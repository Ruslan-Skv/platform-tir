'use client';

import { use } from 'react';

import { CategoryAttributesPage } from '@/pages/admin/Catalog/Categories/CategoryAttributesPage';

export default function AdminCategoryAttributesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <CategoryAttributesPage categoryId={id} />;
}
