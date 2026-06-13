import { CatalogSection } from '@/views/admin/Settings';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

export default function AdminCatalogSettingsPage() {
  return (
    <SettingsSubPageView
      title="Настройки каталога"
      subtitle="Режим просмотра карточек товаров на мобильных устройствах по умолчанию."
    >
      <CatalogSection />
    </SettingsSubPageView>
  );
}
