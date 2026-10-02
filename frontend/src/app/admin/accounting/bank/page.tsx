'use client';

import dynamic from 'next/dynamic';

import { PageSuspenseFallback } from '@/shared/ui/PageSuspenseFallback';

const BankPage = dynamic(
  () => import('@/views/admin/Accounting/Bank/BankPage').then((m) => m.BankPage),
  {
    ssr: false,
    loading: () => <PageSuspenseFallback compact />,
  }
);

export default function AdminAccountingBankPage() {
  return <BankPage />;
}
