import styles from './CategoryAttributesPage.module.css';
import type { Attribute } from './category-attributes-page.types';

const LIST_ATTRIBUTE_TYPES: Attribute['type'][] = ['SELECT', 'MULTI_SELECT'];

export function isListAttributeType(t: Attribute['type']): boolean {
  return LIST_ATTRIBUTE_TYPES.includes(t);
}

/** Генерация slug из названия (транслитерация + допустимые символы). */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .replace(/а/g, 'a')
    .replace(/б/g, 'b')
    .replace(/в/g, 'v')
    .replace(/г/g, 'g')
    .replace(/д/g, 'd')
    .replace(/е/g, 'e')
    .replace(/ё/g, 'yo')
    .replace(/ж/g, 'zh')
    .replace(/з/g, 'z')
    .replace(/и/g, 'i')
    .replace(/й/g, 'y')
    .replace(/к/g, 'k')
    .replace(/л/g, 'l')
    .replace(/м/g, 'm')
    .replace(/н/g, 'n')
    .replace(/о/g, 'o')
    .replace(/п/g, 'p')
    .replace(/р/g, 'r')
    .replace(/с/g, 's')
    .replace(/т/g, 't')
    .replace(/у/g, 'u')
    .replace(/ф/g, 'f')
    .replace(/х/g, 'h')
    .replace(/ц/g, 'ts')
    .replace(/ч/g, 'ch')
    .replace(/ш/g, 'sh')
    .replace(/щ/g, 'sch')
    .replace(/ъ/g, '')
    .replace(/ы/g, 'y')
    .replace(/ь/g, '')
    .replace(/э/g, 'e')
    .replace(/ю/g, 'yu')
    .replace(/я/g, 'ya')
    .substring(0, 100);
}

export function getTypeLabel(type: Attribute['type']): string {
  const labels: Record<Attribute['type'], string> = {
    TEXT: 'Текст',
    NUMBER: 'Число',
    BOOLEAN: 'Да/Нет',
    SELECT: 'Выбор',
    MULTI_SELECT: 'Множ. выбор',
    COLOR: 'Цвет',
  };
  return labels[type];
}

export function attributeTypeBadgeClass(type: Attribute['type']): string {
  const map: Record<Attribute['type'], string> = {
    TEXT: styles.typeText,
    NUMBER: styles.typeNumber,
    BOOLEAN: styles.typeBoolean,
    SELECT: styles.typeSelect,
    MULTI_SELECT: styles.typeMultiSelect,
    COLOR: styles.typeColor,
  };
  return `${styles.attributeType} ${map[type]}`;
}
