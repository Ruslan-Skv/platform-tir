'use client';

import { useParams } from 'next/navigation';

import { PageSuspenseFallback } from '@/shared/ui/PageSuspenseFallback';
import { PackageDocumentEditorPage } from '@/views/admin/ContractDocuments/packages/pages/PackageDocumentEditorPage';

export default function AdminContractDocumentsContractsIdPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  if (!id) {
    return <PageSuspenseFallback compact message="Некорректный идентификатор." />;
  }
  return <PackageDocumentEditorPage packageId={id} />;
}
