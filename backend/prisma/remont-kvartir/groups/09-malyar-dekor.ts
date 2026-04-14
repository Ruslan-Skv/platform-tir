import type { RemontKvartirGroupDef } from '../types';
import { U } from '../units';

export const GROUP_MALYAR_DEKOR: RemontKvartirGroupDef = {
  name: 'Малярные и декоративные работы',
  slug: 'malyar-dekor',
  icon: 'LightBulb',
  subcategories: [
    {
      name: 'Окраска стен и потолков',
      items: [
        { name: 'Покраска стен в один слой', unit: U.m2 },
        { name: 'Покраска стен в два слоя', unit: U.m2 },
        { name: 'Покраска потолков в два слоя', unit: U.m2 },
      ],
    },
    {
      name: 'Окраска элементов (радиаторы, трубы, двери, плинтусы)',
      items: [
        { name: 'Окраска радиатора стального/чугунного', unit: U.sht },
        { name: 'Окраска труб', unit: U.sht },
        { name: 'Окраска металлической двери', unit: U.sht },
        {
          name: 'Окраска плинтуса деревянного или наличника',
          unit: U.mp,
        },
      ],
    },
    {
      name: 'Декоративные штукатурки и покрытия',
      items: [
        { name: 'Декоративная венецианская штукатурка', unit: U.m2 },
        { name: 'Декоративные краски для стен', unit: U.m2 },
        { name: 'Структурная штукатурка (короед/шуба)', unit: U.m2 },
        { name: 'Флоковые покрытия (чипсы)', unit: U.m2 },
        { name: 'Мозаичные мультиколорные краски', unit: U.m2 },
        { name: 'Шёлковые жидкие обои для стен', unit: U.m2 },
        { name: 'Шёлковая штукатурка', unit: U.m2 },
        { name: 'Фактурная декоративная штукатурка', unit: U.m2 },
        { name: 'Окраска декоративной штукатурки (1 слой)', unit: U.m2 },
        { name: 'Нанесение воска/блёсток', unit: U.m2 },
      ],
    },
  ],
};
