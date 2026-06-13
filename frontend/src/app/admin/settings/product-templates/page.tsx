import { ProductTemplatesSection } from '@/views/admin/Settings';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

export default function AdminProductTemplatesPage() {
  return (
    <SettingsSubPageView
      title="Шаблоны товаров"
      subtitle="Настройка шаблонов таблиц и карточек товаров для админки."
    >
      <ProductTemplatesSection />
    </SettingsSubPageView>
  );
}
