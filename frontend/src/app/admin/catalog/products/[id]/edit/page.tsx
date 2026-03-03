'use client';

import { use } from 'react';

import { ProductEditPage } from '@/views/admin/Catalog/Products/ProductEditPage';

export default function AdminProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ProductEditPage productId={id} />;
}
