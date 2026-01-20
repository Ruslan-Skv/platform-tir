'use client';

import { use } from 'react';

import { CategoryEditPage } from '@/pages/admin/Catalog/Categories/CategoryEditPage';

export default function AdminCategoryEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <CategoryEditPage categoryId={id} />;
}
