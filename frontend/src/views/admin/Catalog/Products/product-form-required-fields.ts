import { multiSelectHasSelection } from './category-attribute-multiselect';

/** Строка привязки атрибута к категории (для валидации карточки товара). */
export type CategoryAttrRowForValidation = {
  isRequired: boolean;
  attribute: { slug: string; name: string; type: string };
};

export function categoryAttributeValueFilled(
  type: string,
  raw: string | undefined | null
): boolean {
  if (type === 'MULTI_SELECT') {
    return multiSelectHasSelection(raw);
  }
  return String(raw ?? '').trim().length > 0;
}

/**
 * Атрибуты категории с флагом «обязательный» (задаётся в админке: Категории → атрибуты категории).
 * Подписи в ошибке — как в форме (attribute.name).
 */
export function validateRequiredCategoryAttributes(
  rows: CategoryAttrRowForValidation[],
  attributes: Record<string, string>,
  /** Для атрибута со slug `manufacturer` значение берётся из поля товара, не из `attributes`. */
  manufacturerId?: string
): string[] {
  const missing: string[] = [];
  for (const ca of rows) {
    if (!ca.isRequired) continue;
    if (ca.attribute.slug === 'manufacturer') {
      if (!String(manufacturerId ?? '').trim()) missing.push(ca.attribute.name);
      continue;
    }
    if (!categoryAttributeValueFilled(ca.attribute.type, attributes[ca.attribute.slug])) {
      missing.push(ca.attribute.name);
    }
  }
  return missing;
}

/** Снимок полей карточки товара в админке для проверки обязательных значений и подсветки. */
export interface AdminProductFormSnapshot {
  name: string;
  categoryId: string;
  supplierId: string;
  supplierProductUrl: string;
  supplierSku: string;
  price: string;
  stock: number;
  sizes: string[];
  images: string[];
  /** Значения атрибутов категории по slug. */
  attributes: Record<string, string>;
  /** Связь товара со справочником производителей (атрибут категории `manufacturer`). */
  manufacturerId: string;
}

/** Возвращает подписи незаполненных обязательных полей (по порядку проверки). */
export function validateAdminProductRequiredFields(
  s: AdminProductFormSnapshot,
  categoryAttributes?: CategoryAttrRowForValidation[]
): string[] {
  const missing: string[] = [];
  if (!s.name.trim()) missing.push('Название');
  if (!s.categoryId.trim()) missing.push('Категория');
  if (!s.supplierId.trim()) missing.push('Поставщик');
  if (!s.supplierProductUrl.trim()) missing.push('Ссылка на товар поставщика');

  const priceRaw = String(s.price).trim().replace(',', '.');
  const priceNum = parseFloat(priceRaw);
  if (priceRaw === '' || !Number.isFinite(priceNum) || priceNum <= 0) {
    missing.push('Цена');
  }

  if (!Number.isFinite(s.stock) || s.stock < 0) {
    missing.push('Остаток на складе');
  }

  const cleanedSizes = s.sizes.map((size) => size.trim()).filter((size) => size.length > 0);
  if (cleanedSizes.length === 0) {
    missing.push('Размеры');
  }

  const hasImage = s.images.some((url) => url.trim().length > 0);
  if (!hasImage) {
    missing.push('Изображение');
  }

  if (categoryAttributes?.length) {
    missing.push(
      ...validateRequiredCategoryAttributes(categoryAttributes, s.attributes, s.manufacturerId)
    );
  }

  return missing;
}

/** Поддерживает `styles` из CSS-модуля (`Record<string, string>`) или явную пару классов. */
export function adminProductFieldHighlightClass(
  filled: boolean,
  mod: Record<string, string> & {
    fieldHighlightEmpty?: string;
    fieldHighlightFilled?: string;
  }
): string {
  const empty = mod.fieldHighlightEmpty ?? '';
  const filledCls = mod.fieldHighlightFilled ?? '';
  return filled ? filledCls : empty;
}
