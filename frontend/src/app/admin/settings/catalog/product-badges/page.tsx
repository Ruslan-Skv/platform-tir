import { ProductCardBadgesSection } from '@/views/admin/Settings';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

export default function AdminProductCardBadgesPage() {
  return (
    <SettingsSubPageView
      wide
      headerVariant="badges"
      title="Бэйджи карточки товара"
      subtitle={
        <>
          Картинки для бэйджей слева от фото в каталоге и на странице товара. Рекомендуется{' '}
          <strong>PNG</strong> с прозрачным фоном; также допускается JPEG. В карточке товара
          выбирается до 5 бэйджей из этого списка; справа от фото по-прежнему отображаются «ХИТ»,
          «Новинка», скидка и видео.
        </>
      }
      backLink={{ href: '/admin/settings/catalog', label: '← Настройки каталога' }}
    >
      <ProductCardBadgesSection />
    </SettingsSubPageView>
  );
}
