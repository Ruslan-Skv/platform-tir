import { CallbackFormSection } from '@/views/admin/Settings';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

export default function AdminCallbackFormPage() {
  return (
    <SettingsSubPageView
      title="Заказать звонок"
      subtitle="Настройка формы «Заказать звонок»: email для получения уведомлений."
    >
      <CallbackFormSection />
    </SettingsSubPageView>
  );
}
