'use client';

import dynamic from 'next/dynamic';

import { PageSuspenseFallback } from '@/shared/ui/PageSuspenseFallback';

const MySalaryPage = dynamic(
  () => import('@/views/admin/Accounting/Salary/my/MySalaryPage').then((m) => m.MySalaryPage),
  { ssr: false, loading: () => <PageSuspenseFallback compact /> }
);

export default function AdminAccountingMySalaryPage() {
  return <MySalaryPage />;
}
