import { UserCabinetSection } from '@/views/admin/Settings';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

export default function AdminUserCabinetPage() {
  return (
    <SettingsSubPageView
      title="Личный кабинет пользователя"
      subtitle="Настройки разделов личного кабинета и политики конфиденциальности для форм основного сайта."
    >
      <UserCabinetSection />
    </SettingsSubPageView>
  );
}
