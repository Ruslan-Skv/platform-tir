'use client';

import { use } from 'react';

import { ProductsPage } from '@/pages/admin/Catalog/Products/ProductsPage';

export default function AdminProductsByCategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = use(params);
  return <ProductsPage categoryId={categoryId} />;
}
