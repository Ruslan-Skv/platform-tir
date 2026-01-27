'use client';

import { use } from 'react';

import { SupplierEditPage } from '@/pages/admin/Catalog/Suppliers/SupplierEditPage';

export default function AdminSupplierEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <SupplierEditPage supplierId={id} />;
}
