import { redirect } from 'next/navigation';

export default function AdminCallbackFormRedirectPage() {
  redirect('/admin/settings/notification-channels');
}
