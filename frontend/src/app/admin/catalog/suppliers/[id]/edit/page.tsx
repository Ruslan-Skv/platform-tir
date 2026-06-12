'use client';

import { use } from 'react';

import { SupplierEditPage } from '@/views/admin/Catalog/Suppliers';

export default function AdminSupplierEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <SupplierEditPage supplierId={id} />;
}
