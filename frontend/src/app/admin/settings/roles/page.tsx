import { RolesSection } from '@/views/admin/Settings';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

export default function AdminRolesPage() {
  return (
    <SettingsSubPageView
      title="Роли пользователей"
      subtitle="Роли заданы в базе данных (enum UserRole) и используются для доступа к разделам админки."
    >
      <RolesSection />
    </SettingsSubPageView>
  );
}
