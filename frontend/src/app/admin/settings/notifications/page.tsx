import { NotificationsSection } from '@/views/admin/Settings';
import { ExternalNotifyChannelsSection } from '@/views/admin/Settings/notifications/ExternalNotifyChannelsSection';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

export default function AdminNotificationsPage() {
  return (
    <SettingsSubPageView
      title="Уведомления"
      subtitle="Каналы email/Telegram/MAX, звуковые и браузерные уведомления в админке."
    >
      <ExternalNotifyChannelsSection />
      <NotificationsSection />
    </SettingsSubPageView>
  );
}
