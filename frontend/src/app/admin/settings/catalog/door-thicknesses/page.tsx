import { DoorThicknessSettingsSection } from '@/views/admin/Settings';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

export default function AdminDoorThicknessesSettingsPage() {
  return (
    <SettingsSubPageView
      title="Толщина двери"
      subtitle={
        <>
          Справочник для поля «Толщина двери» в атрибутах категории (slug атрибута обычно{' '}
          <code>door-thickness</code>). Значения в карточке товара выбираются из этого списка.
        </>
      }
      backLink={{ href: '/admin/settings/catalog', label: '← Настройки каталога' }}
    >
      <DoorThicknessSettingsSection />
    </SettingsSubPageView>
  );
}
