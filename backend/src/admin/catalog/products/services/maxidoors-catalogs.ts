import { MAXIDOORS_CYLINDERS_LIST_PATH, MAXIDOORS_HANDLES_LIST_PATH } from './maxidoors-scrape';

export type MaxidoorsCatalogKey = 'handles' | 'cylinders';

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
  slugPrefix: string;
  imageFilePrefix: string;
  seoExtraKeywords: string[];
  attrRules: MaxidoorsAttrRule[];
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
    // ID на проде может отличаться — резолв по имени «Цилиндры (м)»
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
