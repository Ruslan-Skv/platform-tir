import { redirect } from 'next/navigation';

/** Раздел перенесён в модалку «Настройки договоров» (кнопка в шапке договора). */
export default function AdminContractDocumentsNumberingSettingsPage() {
  redirect('/admin/contract-documents/contracts');
}
