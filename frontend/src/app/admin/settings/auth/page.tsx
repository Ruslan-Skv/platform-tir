import { AuthSection } from '@/views/admin/Settings';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

export default function AdminAuthSettingsPage() {
  return (
    <SettingsSubPageView
      title="Авторизация"
      subtitle="Управление способами входа в личный кабинет сайта."
    >
      <AuthSection />
    </SettingsSubPageView>
  );
}
