import { CatalogHubPreviewSection } from '@/views/admin/Settings';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

export default function AdminCatalogHubPreviewPage() {
  return (
    <SettingsSubPageView
      title="Превью каталога"
      subtitle="Настройка блока превью каталога на главной странице."
    >
      <CatalogHubPreviewSection />
    </SettingsSubPageView>
  );
}
