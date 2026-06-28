import { QuoteFormSection } from '@/views/admin/Settings';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

export default function AdminQuoteFormPage() {
  return (
    <SettingsSubPageView
      title="Рассчитать стоимость"
      subtitle="Список видов работ и товаров для формы «Рассчитать стоимость»."
    >
      <QuoteFormSection />
    </SettingsSubPageView>
  );
}
