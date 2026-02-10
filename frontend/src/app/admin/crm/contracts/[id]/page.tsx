'use client';

import { useParams } from 'next/navigation';

import { ContractFormPage } from '@/pages/admin/CRM/Contracts/ContractFormPage';

export default function AdminContractEditPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : undefined;

  return <ContractFormPage contractId={id} />;
}
