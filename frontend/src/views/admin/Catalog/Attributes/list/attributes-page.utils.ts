import type { AdminAttribute, AdminAttributeType } from '@/shared/api/admin-attributes';

import styles from './AttributesPage.module.css';

const LIST_TYPES: AdminAttributeType[] = ['SELECT', 'MULTI_SELECT'];

export function isListAttributeType(type: AdminAttributeType): boolean {
  return LIST_TYPES.includes(type);
}

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

export function getTypeLabel(type: AdminAttributeType): string {
  const labels: Record<AdminAttributeType, string> = {
    TEXT: 'Текст',
    NUMBER: 'Число',
    BOOLEAN: 'Да/Нет',
    SELECT: 'Выбор',
    MULTI_SELECT: 'Множ. выбор',
    COLOR: 'Цвет',
  };
  return labels[type];
}

export function attributeTypeBadgeClass(type: AdminAttributeType): string {
  const map: Record<AdminAttributeType, string> = {
    TEXT: styles.typeText,
    NUMBER: styles.typeNumber,
    BOOLEAN: styles.typeBoolean,
    SELECT: styles.typeSelect,
    MULTI_SELECT: styles.typeMultiSelect,
    COLOR: styles.typeColor,
  };
  return `${styles.attributeType} ${map[type]}`;
}

/** Для фразы «привязана к N …» (дательный падеж). */
export function formatCategoriesCount(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} категории`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} категориям`;
  return `${n} категориям`;
}

/** Подпись счётчика в таблице: «N категория / категории / категорий». */
export function formatCategoriesToggleLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} категория`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} категории`;
  return `${n} категорий`;
}

export function formatAttributesWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'характеристика';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'характеристики';
  return 'характеристик';
}

export function buildDeleteMessage(attribute: AdminAttribute): string {
  const usage = attribute._count?.categories ?? attribute.categories?.length ?? 0;
  const parts = [`Удалить характеристику «${attribute.name}»?`];
  if (usage > 0) {
    const names = (attribute.categories ?? []).map((link) => link.category.name).filter(Boolean);
    if (names.length > 0) {
      parts.push(`Привязана к: ${names.join(', ')}. Привязки будут сняты.`);
    } else {
      parts.push(`Она привязана к ${formatCategoriesCount(usage)} — привязки будут сняты.`);
    }
  }
  parts.push(
    'Определение удалится из каталога. Значения в карточках товаров по этому slug могут остаться до ручной чистки. Действие нельзя отменить.'
  );
  return parts.join(' ');
}
