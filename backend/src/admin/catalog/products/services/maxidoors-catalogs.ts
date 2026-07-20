import {
  MAXIDOORS_APARTMENT_DOORS_LIST_PATH,
  MAXIDOORS_BOLTS_LIST_PATH,
  MAXIDOORS_CLOSERS_LIST_PATH,
  MAXIDOORS_CYLINDERS_LIST_PATH,
  MAXIDOORS_EKOSHAPON_LIST_PATH,
  MAXIDOORS_HANDLES_LIST_PATH,
  MAXIDOORS_HINGES_LIST_PATH,
  MAXIDOORS_LIMITERS_LIST_PATH,
  MAXIDOORS_LOCKS_LIST_PATH,
  MAXIDOORS_MISC_LIST_PATH,
  MAXIDOORS_PLATES_LIST_PATH,
  MAXIDOORS_PLATE_HANDLES_LIST_PATH,
  MAXIDOORS_PVH_LIST_PATH,
  MAXIDOORS_RIGELS_LIST_PATH,
  MAXIDOORS_SLIDING_LIST_PATH,
  MAXIDOORS_THUMBTURNS_LIST_PATH,
  MAXIDOORS_VFD_EMALEX_LIST_PATH,
} from './maxidoors-scrape';

export type MaxidoorsCatalogKey =
  | 'handles'
  | 'cylinders'
  | 'thumbturns'
  | 'limiters'
  | 'bolts'
  | 'plates'
  | 'locks'
  | 'closers'
  | 'rigels'
  | 'sliding'
  | 'hinges'
  | 'plateHandles'
  | 'misc'
  | 'apartmentDoors'
  | 'ekoshpon'
  | 'pvh'
  | 'vfdEmalex';

/**
 * Правило маппинга характеристики MaxiDoors → поле нашей карточки.
 * - manufacturer / coatingMaterial — FK на справочники
 * - json — атрибут категории (Product.attributes)
 * - colorFromName — цвет из названия товара
 */
export type MaxidoorsAttrRule =
  | {
      kind: 'manufacturer';
    }
  | {
      kind: 'coatingMaterial';
      /** Подпись характеристики на сайте поставщика */
      charLabel?: string;
    }
  | {
      kind: 'json';
      name: string;
      slug: string;
      charLabel: string;
      order?: number;
    }
  | {
      kind: 'colorFromName';
      name?: string;
      slug?: string;
      order?: number;
    }
  | {
      /**
       * Все характеристики из charRows (в т.ч. разобранные из блока «Описание»),
       * которые ещё не замаплены другими правилами → JSON-атрибуты категории (создаются при необходимости).
       */
      kind: 'autoChars';
      orderStart?: number;
    };

export type MaxidoorsCatalogConfig = {
  key: MaxidoorsCatalogKey;
  /** Человекочитаемое имя раздела для логов/UI */
  label: string;
  listPath: string;
  /** Прод-ID категории, если известен */
  defaultCategoryId?: string;
  /** Точное имя категории в нашей админке (для резолва и показа кнопки) */
  categoryName: string;
  /** Доп. имена категории (локальные варианты вроде «… (м)») */
  categoryNameAliases?: string[];
  slugPrefix: string;
  imageFilePrefix: string;
  seoExtraKeywords: string[];
  attrRules: MaxidoorsAttrRule[];
  /**
   * Не импортировать карточки «Комплект …» (полотно + фурнитура).
   * Для каталогов дверных полотен — true.
   */
  skipKitProducts?: boolean;
};

/** Прод «Ручки (м)» */
export const MAXIDOORS_HANDLES_CATEGORY_ID = 'cmrq8cmcb00im11w2bxnf0m6i';

export const MAXIDOORS_CATALOGS: Record<MaxidoorsCatalogKey, MaxidoorsCatalogConfig> = {
  handles: {
    key: 'handles',
    label: 'Ручки межкомнатные',
    listPath: MAXIDOORS_HANDLES_LIST_PATH,
    defaultCategoryId: MAXIDOORS_HANDLES_CATEGORY_ID,
    categoryName: 'Ручки (м)',
    slugPrefix: 'ruchka-m',
    imageFilePrefix: 'md-h',
    seoExtraKeywords: ['ручка'],
    attrRules: [
      { kind: 'colorFromName', name: 'Цвет', slug: 'tsvet', order: 20 },
      { kind: 'manufacturer' },
      { kind: 'coatingMaterial', charLabel: 'Материал покрытия' },
    ],
  },
  cylinders: {
    key: 'cylinders',
    label: 'Цилиндры',
    listPath: MAXIDOORS_CYLINDERS_LIST_PATH,
    categoryName: 'Цилиндры (м)',
    slugPrefix: 'cilindr-m',
    imageFilePrefix: 'md-c',
    seoExtraKeywords: ['цилиндр', 'личинка'],
    attrRules: [
      { kind: 'colorFromName', name: 'Цвет', slug: 'tsvet', order: 5 },
      {
        kind: 'json',
        name: 'Секретность',
        slug: 'sekretnost',
        charLabel: 'Секретность',
        order: 10,
      },
      {
        kind: 'json',
        name: 'Количество пинов',
        slug: 'kolichestvo-pinov',
        charLabel: 'Количество пинов',
        order: 20,
      },
      {
        kind: 'json',
        name: 'Количество ключей',
        slug: 'kolichestvo-klyuchey',
        charLabel: 'Количество ключей',
        order: 30,
      },
      {
        kind: 'json',
        name: 'Размер цилиндра',
        slug: 'razmer-cilindra',
        charLabel: 'Размер цилиндра',
        order: 40,
      },
      {
        kind: 'json',
        name: 'Материал',
        slug: 'material',
        charLabel: 'Материал',
        order: 50,
      },
      {
        kind: 'json',
        name: 'Класс Защиты',
        slug: 'klass-zashchity',
        charLabel: 'Класс Защиты',
        order: 60,
      },
      {
        kind: 'json',
        name: 'Механизм постоянного ключа',
        slug: 'mehanizm-postoyannogo-klyucha',
        charLabel: 'Механизм постоянного ключа',
        order: 70,
      },
      { kind: 'manufacturer' },
    ],
  },
  thumbturns: {
    key: 'thumbturns',
    label: 'Завертки',
    listPath: MAXIDOORS_THUMBTURNS_LIST_PATH,
    categoryName: 'Завертки',
    categoryNameAliases: ['Завертки (м)'],
    slugPrefix: 'zavertka-m',
    imageFilePrefix: 'md-z',
    seoExtraKeywords: ['завертка', 'сантехническая завертка'],
    attrRules: [
      { kind: 'colorFromName', name: 'Цвет', slug: 'tsvet', order: 10 },
      { kind: 'manufacturer' },
      { kind: 'coatingMaterial', charLabel: 'Материал покрытия' },
    ],
  },
  limiters: {
    key: 'limiters',
    label: 'Ограничители',
    listPath: MAXIDOORS_LIMITERS_LIST_PATH,
    categoryName: 'Ограничители (м)',
    categoryNameAliases: ['Ограничители'],
    slugPrefix: 'ogranichitel-m',
    imageFilePrefix: 'md-o',
    seoExtraKeywords: ['ограничитель', 'упор дверной', 'стоппер'],
    attrRules: [
      { kind: 'colorFromName', name: 'Цвет', slug: 'tsvet', order: 10 },
      { kind: 'manufacturer' },
      { kind: 'coatingMaterial', charLabel: 'Материал покрытия' },
      {
        kind: 'json',
        name: 'Материал',
        slug: 'material',
        charLabel: 'Материал',
        order: 20,
      },
    ],
  },
  bolts: {
    key: 'bolts',
    label: 'Задвижки и засовы',
    listPath: MAXIDOORS_BOLTS_LIST_PATH,
    categoryName: 'Задвижки и засовы (м)',
    categoryNameAliases: ['Задвижки и засовы'],
    slugPrefix: 'zadvizhka-m',
    imageFilePrefix: 'md-b',
    seoExtraKeywords: ['задвижка', 'засов', 'шпингалет'],
    attrRules: [
      { kind: 'colorFromName', name: 'Цвет', slug: 'tsvet', order: 10 },
      { kind: 'manufacturer' },
      { kind: 'coatingMaterial', charLabel: 'Материал покрытия' },
      {
        kind: 'json',
        name: 'Материал',
        slug: 'material',
        charLabel: 'Материал',
        order: 20,
      },
    ],
  },
  plates: {
    key: 'plates',
    label: 'Накладки на цилиндр',
    listPath: MAXIDOORS_PLATES_LIST_PATH,
    categoryName: 'Накладки на цилиндр (м)',
    categoryNameAliases: ['Накладки на цилиндр'],
    slugPrefix: 'nakladka-m',
    imageFilePrefix: 'md-p',
    seoExtraKeywords: ['накладка на цилиндр', 'розетка', 'накладка ключевая'],
    attrRules: [
      { kind: 'colorFromName', name: 'Цвет', slug: 'tsvet', order: 10 },
      { kind: 'manufacturer' },
      { kind: 'coatingMaterial', charLabel: 'Материал покрытия' },
      {
        kind: 'json',
        name: 'Материал',
        slug: 'material',
        charLabel: 'Материал',
        order: 20,
      },
    ],
  },
  locks: {
    key: 'locks',
    label: 'Замки',
    listPath: MAXIDOORS_LOCKS_LIST_PATH,
    categoryName: 'Замки (м)',
    categoryNameAliases: ['Замки'],
    slugPrefix: 'zamok-m',
    imageFilePrefix: 'md-l',
    seoExtraKeywords: ['замок', 'замок дверной', 'замок врезной'],
    attrRules: [
      { kind: 'colorFromName', name: 'Цвет', slug: 'tsvet', order: 5 },
      {
        kind: 'json',
        name: 'Класс Защиты',
        slug: 'klass-zashchity',
        charLabel: 'Класс Защиты',
        order: 10,
      },
      {
        kind: 'json',
        name: 'Тип',
        slug: 'tip',
        charLabel: 'Тип',
        order: 20,
      },
      { kind: 'manufacturer' },
      { kind: 'coatingMaterial', charLabel: 'Материал покрытия' },
      {
        kind: 'json',
        name: 'Материал',
        slug: 'material',
        charLabel: 'Материал',
        order: 30,
      },
    ],
  },
  closers: {
    key: 'closers',
    label: 'Доводчики',
    listPath: MAXIDOORS_CLOSERS_LIST_PATH,
    categoryName: 'Доводчики (м)',
    categoryNameAliases: ['Доводчики'],
    slugPrefix: 'dovodchik-m',
    imageFilePrefix: 'md-d',
    seoExtraKeywords: ['доводчик', 'доводчик дверной'],
    attrRules: [
      { kind: 'colorFromName', name: 'Цвет', slug: 'tsvet', order: 10 },
      {
        kind: 'json',
        name: 'Класс',
        slug: 'klass',
        charLabel: 'Класс',
        order: 20,
      },
      { kind: 'manufacturer' },
      { kind: 'coatingMaterial', charLabel: 'Материал покрытия' },
      {
        kind: 'json',
        name: 'Материал',
        slug: 'material',
        charLabel: 'Материал',
        order: 30,
      },
    ],
  },
  rigels: {
    key: 'rigels',
    label: 'Ригели',
    listPath: MAXIDOORS_RIGELS_LIST_PATH,
    categoryName: 'Ригели (м)',
    categoryNameAliases: ['Ригели'],
    slugPrefix: 'rigel-m',
    imageFilePrefix: 'md-r',
    seoExtraKeywords: ['ригель', 'шпингалет', 'ригель торцевой'],
    attrRules: [
      { kind: 'colorFromName', name: 'Цвет', slug: 'tsvet', order: 10 },
      { kind: 'manufacturer' },
      { kind: 'coatingMaterial', charLabel: 'Материал покрытия' },
      {
        kind: 'json',
        name: 'Материал',
        slug: 'material',
        charLabel: 'Материал',
        order: 20,
      },
    ],
  },
  sliding: {
    key: 'sliding',
    label: 'Комплектующие для раздвижных дверей',
    listPath: MAXIDOORS_SLIDING_LIST_PATH,
    categoryName: 'Комплектующие для раздвижных дверей (м)',
    categoryNameAliases: ['Комплектующие для раздвижных дверей'],
    slugPrefix: 'razdvizhnye-m',
    imageFilePrefix: 'md-s',
    seoExtraKeywords: [
      'комплектующие для раздвижных дверей',
      'механизм раздвижной двери',
      'профиль раздвижной',
    ],
    attrRules: [
      { kind: 'colorFromName', name: 'Цвет', slug: 'tsvet', order: 10 },
      { kind: 'manufacturer' },
      { kind: 'coatingMaterial', charLabel: 'Материал покрытия' },
      {
        kind: 'json',
        name: 'Материал',
        slug: 'material',
        charLabel: 'Материал',
        order: 20,
      },
    ],
  },
  hinges: {
    key: 'hinges',
    label: 'Петли дверные',
    listPath: MAXIDOORS_HINGES_LIST_PATH,
    categoryName: 'Петли (м)',
    categoryNameAliases: ['Петли', 'Петли дверные', 'Петли дверные (м)'],
    slugPrefix: 'petlya-m',
    imageFilePrefix: 'md-g',
    seoExtraKeywords: ['петля', 'петля дверная', 'петли дверные'],
    attrRules: [
      { kind: 'colorFromName', name: 'Цвет', slug: 'tsvet', order: 10 },
      { kind: 'manufacturer' },
      { kind: 'coatingMaterial', charLabel: 'Материал покрытия' },
      {
        kind: 'json',
        name: 'Материал',
        slug: 'material',
        charLabel: 'Материал',
        order: 20,
      },
    ],
  },
  plateHandles: {
    key: 'plateHandles',
    label: 'Ручки на планке',
    listPath: MAXIDOORS_PLATE_HANDLES_LIST_PATH,
    categoryName: 'Ручки на планке (м)',
    categoryNameAliases: ['Ручки на планке'],
    slugPrefix: 'ruchka-planka-m',
    imageFilePrefix: 'md-ph',
    seoExtraKeywords: ['ручка на планке', 'ручка-замок на планке'],
    attrRules: [
      { kind: 'colorFromName', name: 'Цвет', slug: 'tsvet', order: 10 },
      { kind: 'manufacturer' },
      { kind: 'coatingMaterial', charLabel: 'Материал покрытия' },
      {
        kind: 'json',
        name: 'Материал',
        slug: 'material',
        charLabel: 'Материал',
        order: 20,
      },
    ],
  },
  misc: {
    key: 'misc',
    label: 'Разное',
    listPath: MAXIDOORS_MISC_LIST_PATH,
    categoryName: 'Разное (м)',
    categoryNameAliases: ['Разное'],
    slugPrefix: 'raznoe-m',
    imageFilePrefix: 'md-m',
    seoExtraKeywords: ['фурнитура', 'дополнения для дверей'],
    attrRules: [
      { kind: 'colorFromName', name: 'Цвет', slug: 'tsvet', order: 10 },
      { kind: 'manufacturer' },
      { kind: 'coatingMaterial', charLabel: 'Материал покрытия' },
      {
        kind: 'json',
        name: 'Материал',
        slug: 'material',
        charLabel: 'Материал',
        order: 20,
      },
    ],
  },
  apartmentDoors: {
    key: 'apartmentDoors',
    label: 'Двери в квартиру',
    listPath: MAXIDOORS_APARTMENT_DOORS_LIST_PATH,
    categoryName: 'Двери в квартиру (м)',
    categoryNameAliases: ['Двери в квартиру'],
    slugPrefix: 'dver-kvartira-m',
    imageFilePrefix: 'md-ad',
    seoExtraKeywords: ['входная дверь', 'дверь в квартиру', 'металлическая дверь'],
    skipKitProducts: true,
    attrRules: [
      { kind: 'colorFromName', name: 'Цвет', slug: 'tsvet', order: 5 },
      { kind: 'manufacturer' },
      // Параметры из блока «Описание» на карточке поставщика → отдельные атрибуты
      { kind: 'autoChars', orderStart: 10 },
    ],
  },
  ekoshpon: {
    key: 'ekoshpon',
    label: 'Двери экошпон',
    listPath: MAXIDOORS_EKOSHAPON_LIST_PATH,
    defaultCategoryId: 'cmrt2frl10005fnhxel2vno8i',
    categoryName: 'Двери экошпон (м)',
    categoryNameAliases: ['Двери экошпон'],
    slugPrefix: 'dver-ekoshpon-m',
    imageFilePrefix: 'md-ek',
    seoExtraKeywords: ['межкомнатная дверь', 'экошпон', 'двери экошпон'],
    skipKitProducts: true,
    attrRules: [
      { kind: 'manufacturer' },
      { kind: 'coatingMaterial', charLabel: 'Материал покрытия' },
      // Характеристики карточки (тип полотна, цвет двери, толщина и т.д.)
      // Блок «Комплектующие» и цена комплекта не импортируются.
      { kind: 'autoChars', orderStart: 10 },
    ],
  },
  pvh: {
    key: 'pvh',
    label: 'Двери ПВХ',
    listPath: MAXIDOORS_PVH_LIST_PATH,
    defaultCategoryId: 'cmrt38k540001cqf2sww09mxw',
    categoryName: 'Двери ПВХ (м)',
    categoryNameAliases: ['Двери ПВХ'],
    slugPrefix: 'dver-pvh-m',
    imageFilePrefix: 'md-pvh',
    seoExtraKeywords: ['межкомнатная дверь', 'пвх', 'двери пвх'],
    skipKitProducts: true,
    attrRules: [
      { kind: 'manufacturer' },
      // На карточках ПВХ чаще «Материал:», не «Материал покрытия:»
      { kind: 'coatingMaterial', charLabel: 'Материал' },
      // Блок «Комплектующие» и цена комплекта не импортируются.
      { kind: 'autoChars', orderStart: 10 },
    ],
  },
  vfdEmalex: {
    key: 'vfdEmalex',
    label: 'Двери ВФД Эмалекс',
    listPath: MAXIDOORS_VFD_EMALEX_LIST_PATH,
    defaultCategoryId: 'cmrt3yktl000b2a1dvj2gwz0u',
    categoryName: 'Двери ВФД Эмалекс (м)',
    categoryNameAliases: ['Двери ВФД Эмалекс', 'ВФД Эмалекс (м)'],
    slugPrefix: 'dver-vfd-emalex-m',
    imageFilePrefix: 'md-vfd',
    seoExtraKeywords: ['межкомнатная дверь', 'вфд', 'эмалекс', 'двери эмалекс'],
    skipKitProducts: true,
    attrRules: [
      { kind: 'manufacturer' },
      { kind: 'coatingMaterial', charLabel: 'Материал покрытия' },
      // Блок «Комплектующие» и цена комплекта не импортируются.
      { kind: 'autoChars', orderStart: 10 },
    ],
  },
};

export function getMaxidoorsCatalog(key: string): MaxidoorsCatalogConfig {
  const catalog = MAXIDOORS_CATALOGS[key as MaxidoorsCatalogKey];
  if (!catalog) {
    throw new Error(
      `Неизвестный каталог MaxiDoors «${key}». Доступны: ${Object.keys(MAXIDOORS_CATALOGS).join(', ')}`,
    );
  }
  return catalog;
}

export function listMaxidoorsCatalogKeys(): MaxidoorsCatalogKey[] {
  return Object.keys(MAXIDOORS_CATALOGS) as MaxidoorsCatalogKey[];
}

export function maxidoorsCatalogCategoryNames(catalog: MaxidoorsCatalogConfig): string[] {
  return [catalog.categoryName, ...(catalog.categoryNameAliases ?? [])];
}
