import { PartnerProductsSection } from '@/views/admin/Settings';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

export default function AdminPartnerProductsPage() {
  return (
    <SettingsSubPageView
      title="Товары партнёра"
      subtitle="Настройки отображения товаров партнёра на карточках в публичной части."
    >
      <PartnerProductsSection />
    </SettingsSubPageView>
  );
}
