'use client';

import { useParams } from 'next/navigation';

import { RepairContractDocumentEditorPage } from '@/views/admin/ContractDocuments/repair/RepairContractDocumentEditorPage';

export default function AdminContractDocumentsRepairIdPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  if (!id) {
    return <p style={{ padding: 24 }}>Некорректный идентификатор.</p>;
  }
  return <RepairContractDocumentEditorPage packageId={id} />;
}
