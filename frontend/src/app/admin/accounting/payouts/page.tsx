'use client';

import dynamic from 'next/dynamic';

import { PageSuspenseFallback } from '@/shared/ui/PageSuspenseFallback';

const PayoutsPage = dynamic(
  () => import('@/views/admin/Accounting/Payouts/PayoutsPage').then((m) => m.PayoutsPage),
  {
    ssr: false,
    loading: () => <PageSuspenseFallback compact />,
  }
);

export default function AdminAccountingPayoutsPage() {
  return <PayoutsPage />;
}
