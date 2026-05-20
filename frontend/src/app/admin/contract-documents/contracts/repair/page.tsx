import { redirect } from 'next/navigation';

/** Старый URL списка договоров «Ремонт» — перенаправление в раздел «Договора». */
export default function AdminContractDocumentsContractsRepairRedirectPage() {
  redirect('/admin/contract-documents/contracts');
}
