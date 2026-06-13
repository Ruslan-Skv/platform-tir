import { NotificationsSection } from '@/views/admin/Settings';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

export default function AdminNotificationsPage() {
  return (
    <SettingsSubPageView
      title="Уведомления"
      subtitle="Настройка звуковых и браузерных уведомлений при появлении новых отзывов."
    >
      <NotificationsSection />
    </SettingsSubPageView>
  );
}
