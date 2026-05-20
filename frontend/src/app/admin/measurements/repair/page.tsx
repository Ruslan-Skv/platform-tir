import { redirect } from 'next/navigation';

/** Старый URL списка замеров — перенаправление в раздел «Замеры». */
export default function AdminRepairMeasurementsRedirectPage() {
  redirect('/admin/measurements');
}
