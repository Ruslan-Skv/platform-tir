'use client';

import dynamic from 'next/dynamic';

import { PageSuspenseFallback } from '@/shared/ui/PageSuspenseFallback';

const SuppliersPage = dynamic(
  () => import('@/views/admin/Suppliers/list/SuppliersPage').then((m) => m.SuppliersPage),
  {
    ssr: false,
    loading: () => <PageSuspenseFallback compact />,
  }
);

export default function AdminSuppliersPage() {
  return <SuppliersPage />;
}
