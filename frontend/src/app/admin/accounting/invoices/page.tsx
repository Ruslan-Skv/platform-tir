'use client';

import dynamic from 'next/dynamic';

import { PageSuspenseFallback } from '@/shared/ui/PageSuspenseFallback';

const AccountingInvoicesPage = dynamic(
  () =>
    import('@/views/admin/Accounting/AccountingInvoicesPage').then((m) => m.AccountingInvoicesPage),
  { ssr: false, loading: () => <PageSuspenseFallback compact /> }
);

export default function AdminAccountingInvoicesPage() {
  return <AccountingInvoicesPage />;
}
