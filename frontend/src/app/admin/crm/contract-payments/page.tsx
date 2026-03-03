'use client';

import dynamic from 'next/dynamic';

const ContractPaymentsPage = dynamic(
  () =>
    import('@/views/admin/CRM/ContractPayments/ContractPaymentsPage').then(
      (m) => m.ContractPaymentsPage
    ),
  { ssr: false, loading: () => <div style={{ padding: 24 }}>Загрузка...</div> }
);

export default function AdminContractPaymentsPage() {
  return <ContractPaymentsPage />;
}
