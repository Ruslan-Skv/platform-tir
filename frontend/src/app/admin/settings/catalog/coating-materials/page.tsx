import { CoatingMaterialsSettingsSection } from '@/views/admin/Settings';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

export default function AdminCoatingMaterialsSettingsPage() {
  return (
    <SettingsSubPageView
      title="Материалы покрытия"
      subtitle={
        <>
          Справочник для поля «Материал покрытия» в атрибутах категории (slug атрибута:{' '}
          <code>coating-material</code>). Добавление, редактирование и удаление позиций.
        </>
      }
      backLink={{ href: '/admin/settings/catalog', label: '← Настройки каталога' }}
    >
      <CoatingMaterialsSettingsSection />
    </SettingsSubPageView>
  );
}
