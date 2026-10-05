'use client';

import dynamic from 'next/dynamic';

import { PageSuspenseFallback } from '@/shared/ui/PageSuspenseFallback';

const CashPage = dynamic(
  () => import('@/views/admin/Accounting/Cash/CashPage').then((m) => m.CashPage),
  {
    ssr: false,
    loading: () => <PageSuspenseFallback compact />,
  }
);

export default function AdminAccountingCashPage() {
  return <CashPage />;
}
