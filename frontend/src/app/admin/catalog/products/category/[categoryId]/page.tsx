'use client';

import { Suspense, use } from 'react';

import { ProductsPage } from '@/views/admin/Catalog/Products/ProductsPage';

export default function AdminProductsByCategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = use(params);
  return (
    <Suspense fallback={<div style={{ padding: '2rem' }}>Загрузка...</div>}>
      <ProductsPage categoryId={categoryId} />
    </Suspense>
  );
}
