import { MeasurementFormSection } from '@/views/admin/Settings';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

export default function AdminMeasurementFormPage() {
  return (
    <SettingsSubPageView
      title="Записаться на замер"
      subtitle="Настройка формы «Записаться на замер»: email для получения уведомлений."
    >
      <MeasurementFormSection />
    </SettingsSubPageView>
  );
}
