import { QuoteFormSection } from '@/views/admin/Settings';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

export default function AdminQuoteFormPage() {
  return (
    <SettingsSubPageView
      title="Рассчитать стоимость"
      subtitle="Настройка формы «Рассчитать стоимость» / «Отправить заявку»: email для получения уведомлений."
    >
      <QuoteFormSection />
    </SettingsSubPageView>
  );
}
