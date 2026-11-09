import { MeasurementFormSection } from '@/views/admin/Settings';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

export default function AdminMeasurementFormPage() {
  return (
    <SettingsSubPageView
      title="Запись на замер"
      subtitle="Список позиций «Интересующий товар» для формы «Запись на бесплатный замер»."
    >
      <MeasurementFormSection />
    </SettingsSubPageView>
  );
}
