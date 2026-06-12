'use client';

import { Suspense } from 'react';

import { ProductsPage } from '@/views/admin/Catalog/Products';

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem' }}>Загрузка...</div>}>
      <ProductsPage />
    </Suspense>
  );
}
