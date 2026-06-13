'use client';

import { Suspense } from 'react';

import { PageSuspenseFallback } from '@/shared/ui/PageSuspenseFallback';
import { ProductsPage } from '@/views/admin/Catalog/Products';

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<PageSuspenseFallback message="Загрузка..." />}>
      <ProductsPage />
    </Suspense>
  );
}
