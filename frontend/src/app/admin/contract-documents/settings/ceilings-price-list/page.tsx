import { redirect } from 'next/navigation';

/** Старый путь под «Оформление договоров» → раздел «Прайсы». */
export default function AdminContractDocumentsCeilingsPriceListRedirectPage() {
  redirect('/admin/price-lists/ceilings');
}
