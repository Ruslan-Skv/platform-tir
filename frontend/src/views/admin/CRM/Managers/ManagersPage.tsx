import { redirect } from 'next/navigation';

/** Старый маршрут CRM; раздел перенесён в «Оформление договоров → Менеджеры». */
export function ManagersPage(): never {
  redirect('/admin/contract-documents/signatories');
}
