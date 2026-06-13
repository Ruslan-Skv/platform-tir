import { DirectorMessageSection } from '@/views/admin/Settings';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

export default function AdminDirectorMessagePage() {
  return (
    <SettingsSubPageView
      title="Письмо директору"
      subtitle="Настройка формы «Письмо директору»: email для получения сообщений."
    >
      <DirectorMessageSection />
    </SettingsSubPageView>
  );
}
