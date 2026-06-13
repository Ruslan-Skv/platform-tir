import { ManufacturersSettingsSection } from '@/views/admin/Settings';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

export default function AdminManufacturersSettingsPage() {
  return (
    <SettingsSubPageView
      title="Производители"
      subtitle="Справочник для поля «Производитель» в карточке товара: добавление, редактирование и удаление позиций."
      backLink={{ href: '/admin/settings/catalog', label: '← Настройки каталога' }}
    >
      <ManufacturersSettingsSection />
    </SettingsSubPageView>
  );
}
