'use client';

import dynamic from 'next/dynamic';

import { PageSuspenseFallback } from '@/shared/ui/PageSuspenseFallback';

const BankReconciliationPage = dynamic(
  () =>
    import('@/views/admin/Accounting/Bank/Reconciliation/BankReconciliationPage').then(
      (m) => m.BankReconciliationPage
    ),
  { ssr: false, loading: () => <PageSuspenseFallback compact /> }
);

export default function AdminBankReconciliationPage() {
  return <BankReconciliationPage />;
}
