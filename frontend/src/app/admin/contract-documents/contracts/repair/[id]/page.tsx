import { redirect } from 'next/navigation';

type PageProps = { params: Promise<{ id: string }> };

/** Старый URL пакета договора «Ремонт» — перенаправление в раздел «Договора». */
export default async function AdminContractDocumentsContractsRepairIdRedirectPage({
  params,
}: PageProps) {
  const { id } = await params;
  redirect(`/admin/contract-documents/contracts/${encodeURIComponent(id)}`);
}
