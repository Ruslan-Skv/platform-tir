import { CatalogFilterBlockSection } from '@/views/admin/Settings';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

export default function AdminCatalogFiltersPage() {
  return (
    <SettingsSubPageView
      title="Блок фильтров каталога"
      subtitle="Настройка отображения блока фильтров на страницах каталога."
    >
      <CatalogFilterBlockSection />
    </SettingsSubPageView>
  );
}
