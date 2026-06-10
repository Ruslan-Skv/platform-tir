'use client';

import { useParams } from 'next/navigation';

import { PackageDocumentEditorPage } from '@/views/admin/ContractDocuments/packages/pages/PackageDocumentEditorPage';

export default function AdminContractDocumentsContractsIdPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  if (!id) {
    return <p style={{ padding: 24 }}>Некорректный идентификатор.</p>;
  }
  return <PackageDocumentEditorPage packageId={id} />;
}
