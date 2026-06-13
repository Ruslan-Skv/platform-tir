import { CanvasTypesSettingsSection } from '@/views/admin/Settings';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

export default function AdminCanvasTypesSettingsPage() {
  return (
    <SettingsSubPageView
      title="Типы полотна"
      subtitle="Справочник для поля «Тип полотна» в атрибутах категории (slug атрибута в каталоге обычно canvas-type). Значения в карточке товара выбираются из этого списка."
      backLink={{ href: '/admin/settings/catalog', label: '← Настройки каталога' }}
    >
      <CanvasTypesSettingsSection />
    </SettingsSubPageView>
  );
}
