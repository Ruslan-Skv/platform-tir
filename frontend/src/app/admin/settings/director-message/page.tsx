import { redirect } from 'next/navigation';

export default function AdminDirectorMessageRedirectPage() {
  redirect('/admin/settings/notification-channels');
}
