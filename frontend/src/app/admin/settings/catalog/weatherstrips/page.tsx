import { WeatherstripSettingsSection } from '@/views/admin/Settings';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

export default function AdminWeatherstripsSettingsPage() {
  return (
    <SettingsSubPageView
      title="Уплотнители"
      subtitle={
        <>
          Справочник для поля «Уплотнители» в атрибутах категории (slug атрибута обычно{' '}
          <code>weatherstrip</code>). Значения в карточке товара выбираются из этого списка.
        </>
      }
      backLink={{ href: '/admin/settings/catalog', label: '← Настройки каталога' }}
    >
      <WeatherstripSettingsSection />
    </SettingsSubPageView>
  );
}
