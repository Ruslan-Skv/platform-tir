import type { Metadata } from 'next';

import { MyNotificationsPageView } from '@/views/admin/Settings/my-notifications/MyNotificationsPageView';

export const metadata: Metadata = {
  title: 'Мои уведомления',
};

export default function AdminMyNotificationsPage() {
  return <MyNotificationsPageView />;
}
