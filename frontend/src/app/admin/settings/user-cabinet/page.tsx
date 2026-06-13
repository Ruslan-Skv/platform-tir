import { UserCabinetSection } from '@/views/admin/Settings';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

export default function AdminUserCabinetPage() {
  return (
    <SettingsSubPageView
      title="Личный кабинет пользователя"
      subtitle="Настройки разделов и функций личного кабинета на публичном сайте."
    >
      <UserCabinetSection />
    </SettingsSubPageView>
  );
}
