import type { RemontKvartirGroupDef } from '../types';
import { U } from '../units';

export const GROUP_PROCHIE: RemontKvartirGroupDef = {
  name: 'Прочие работы',
  slug: 'prochie',
  icon: 'Home',
  // description:
  //   'То, что не вошло в другие группы, но должно быть доступно в каталоге.',
  subcategories: [
    {
      name: 'Вентиляция',
      items: [
        { name: 'Установка решетки вентиляции', unit: U.sht },
        { name: 'Установка вентилятора в вытяжку', unit: U.sht },
        { name: 'Монтаж короба под вентиляцию', unit: U.sht },
        { name: 'Монтаж вентиляции', unit: U.sht },
      ],
    },
    {
      name: 'Разное',
      items: [
        { name: 'Штробление стен под водорозетку', unit: U.sht },
        { name: 'Установка подоконника пластикового', unit: U.sht },
        { name: 'Монтаж оконных откосов из ГКЛ', unit: U.m2 },
        { name: 'Монтаж оконных откосов из ПВХ', unit: U.mp },
        { name: 'Монтаж экрана под ванну', unit: U.sht },
        { name: 'Монтаж зеркала на стену', unit: U.sht },
        { name: 'Монтаж крючка', unit: U.sht },
        { name: 'Монтаж лианы', unit: U.sht },
        { name: 'Установка закладной', unit: U.sht },
        { name: 'Установка замка', unit: U.sht },
        { name: 'Перенос проводки 1 линия', unit: U.sht },
        { name: 'Подгонка плинтуса пластикового', unit: U.sht },
        { name: 'Подгонка плинтуса деревянного', unit: U.sht },
        { name: 'Подрезка кафельной плитки (1 сторона)', unit: U.sht },
      ],
    },
    {
      name: 'Логистика и выезды',
      items: [
        { name: 'Вынос мусора (800р/час)', unit: U.chas },
        { name: 'Дополнительный выезд', unit: U.sht },
      ],
    },
  ],
};
