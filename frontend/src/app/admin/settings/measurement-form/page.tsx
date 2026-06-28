import { redirect } from 'next/navigation';

export default function AdminMeasurementFormRedirectPage() {
  redirect('/admin/settings/notification-channels');
}
