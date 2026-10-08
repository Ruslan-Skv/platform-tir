'use client';

import dynamic from 'next/dynamic';

import { PageSuspenseFallback } from '@/shared/ui/PageSuspenseFallback';

const SalaryPage = dynamic(
  () => import('@/views/admin/Accounting/Salary/SalaryPage').then((m) => m.SalaryPage),
  { ssr: false, loading: () => <PageSuspenseFallback compact /> }
);

export default function AdminAccountingSalaryPage() {
  return <SalaryPage />;
}
