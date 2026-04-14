import type { RemontKvartirGroupDef } from '../types';
import { U } from '../units';

export const GROUP_ZHALJUZI: RemontKvartirGroupDef = {
  name: 'Жалюзи',
  slug: 'zhaljuzi',
  icon: 'ViewColumns',
  description:
    'На данный момент услуги отсутствуют. Ниже — примеры позиций, которые можно добавить позднее.',
  subcategories: [
    {
      name: 'Примеры позиций (заполните по мере появления прайса)',
      items: [
        { name: 'Установка горизонтальных жалюзи', unit: U.sht },
        { name: 'Установка вертикальных жалюзи', unit: U.sht },
        { name: 'Установка рулонных штор (mini)', unit: U.sht },
      ],
    },
  ],
};
