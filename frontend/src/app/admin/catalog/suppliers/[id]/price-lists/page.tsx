'use client';

import { use } from 'react';

import { SupplierPriceListsPage } from '@/views/admin/Catalog/Suppliers/price-lists/SupplierPriceListsPage';

export default function AdminSupplierPriceListsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <SupplierPriceListsPage supplierId={id} />;
}
