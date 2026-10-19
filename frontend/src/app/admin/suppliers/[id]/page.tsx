'use client';

import dynamic from 'next/dynamic';

import { PageSuspenseFallback } from '@/shared/ui/PageSuspenseFallback';

const SupplierDetailPage = dynamic(
  () =>
    import('@/views/admin/Suppliers/detail/SupplierDetailPage').then((m) => m.SupplierDetailPage),
  {
    ssr: false,
    loading: () => <PageSuspenseFallback compact />,
  }
);

export default function AdminSupplierDetailPage() {
  return <SupplierDetailPage />;
}
