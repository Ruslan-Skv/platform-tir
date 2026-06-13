'use client';

import dynamic from 'next/dynamic';

import { PageSuspenseFallback } from '@/shared/ui/PageSuspenseFallback';

const ContractPaymentsPage = dynamic(
  () =>
    import('@/views/admin/CRM/ContractPayments/ContractPaymentsPage').then(
      (m) => m.ContractPaymentsPage
    ),
  { ssr: false, loading: () => <PageSuspenseFallback compact message="Загрузка..." /> }
);

export default function AdminContractPaymentsPage() {
  return <ContractPaymentsPage />;
}
