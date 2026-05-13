import { redirect } from 'next/navigation';

type Props = { params: Promise<{ id: string }> };

export default async function AdminContractDocumentsRepairIdLegacyRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/admin/contract-documents/contracts/repair/${encodeURIComponent(id)}`);
}
