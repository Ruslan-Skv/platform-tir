'use client';

import { Suspense, use } from 'react';

import { PageSuspenseFallback } from '@/shared/ui/PageSuspenseFallback';
import { ProductsPage } from '@/views/admin/Catalog/Products';

export default function AdminProductsByCategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = use(params);
  return (
    <Suspense fallback={<PageSuspenseFallback message="Загрузка..." />}>
      <ProductsPage categoryId={categoryId} />
    </Suspense>
  );
}
