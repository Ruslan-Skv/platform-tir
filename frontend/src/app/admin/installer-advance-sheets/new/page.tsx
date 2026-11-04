import { redirect } from 'next/navigation';

/** Форма создания ведомости переехала в модалку списка «Расчётники мастеров». */
export default function AdminInstallerAdvanceSheetCreatePage() {
  redirect('/admin/installer-advance-sheets');
}
