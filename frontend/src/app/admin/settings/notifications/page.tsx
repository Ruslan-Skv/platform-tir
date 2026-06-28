import Link from 'next/link';

import { NotificationsSection } from '@/views/admin/Settings';
import pageStyles from '@/views/admin/Settings/shared/SettingsPage.module.css';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

export default function AdminNotificationsPage() {
  return (
    <SettingsSubPageView
      title="Уведомления в админке"
      subtitle="Звук, браузерные и push-уведомления при событиях в панели управления."
    >
      <p className={pageStyles.sectionDescription}>
        Каналы email, Telegram и MAX для заявок настраиваются в разделе{' '}
        <Link href="/admin/settings/notification-channels" className={pageStyles.infoBlockLink}>
          Каналы уведомлений о заявках
        </Link>
        .
      </p>
      <NotificationsSection />
    </SettingsSubPageView>
  );
}
