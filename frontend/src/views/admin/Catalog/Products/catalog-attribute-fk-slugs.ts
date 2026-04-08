/** Атрибут категории: значение из справочника производителей (`Product.manufacturerId`). */
export const CATEGORY_ATTR_SLUG_MANUFACTURER = 'manufacturer';

/**
 * Атрибут категории «Материал покрытия»: значение из справочника (`Product.coatingMaterialId`).
 * Убедитесь, что у атрибута в каталоге задан такой же slug.
 */
export const CATEGORY_ATTR_SLUG_COATING_MATERIAL = 'coating-material';

/** Атрибут «Тип полотна» — значение из справочника (`Product.canvasTypeId`). */
export const CATEGORY_ATTR_SLUG_CANVAS_TYPE = 'canvas-type';

/** Атрибут «Толщина двери» — значение из справочника (`Product.doorThicknessId`). */
export const CATEGORY_ATTR_SLUG_DOOR_THICKNESS = 'door-thickness';

/** Атрибут «Уплотнители» — значение из справочника (`Product.weatherstripId`). */
export const CATEGORY_ATTR_SLUG_WEATHERSTRIP = 'weatherstrip';

/** Приводит slug атрибута к каноническому виду для сравнения (нижний регистр, `_` → `-`). */
export function normalizeCategoryAttrSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/_/g, '-');
}

/** Справочник производителей: совпадение по slug (допускаются `manufacturer`, `MANUFACTURER`). */
export function isManufacturerFkCategorySlug(slug: string): boolean {
  return normalizeCategoryAttrSlug(slug) === CATEGORY_ATTR_SLUG_MANUFACTURER;
}

/** Справочник материалов покрытия: slug как в БД (`coating-material`). */
export function isCoatingMaterialFkCategorySlug(slug: string): boolean {
  return normalizeCategoryAttrSlug(slug) === CATEGORY_ATTR_SLUG_COATING_MATERIAL;
}

/** Справочник типа полотна: slug `canvas-type`. */
export function isCanvasTypeFkCategorySlug(slug: string): boolean {
  return normalizeCategoryAttrSlug(slug) === CATEGORY_ATTR_SLUG_CANVAS_TYPE;
}

/** Справочник толщины двери: slug `door-thickness`. */
export function isDoorThicknessFkCategorySlug(slug: string): boolean {
  return normalizeCategoryAttrSlug(slug) === CATEGORY_ATTR_SLUG_DOOR_THICKNESS;
}

/** Справочник уплотнителей: slug `weatherstrip`. */
export function isWeatherstripFkCategorySlug(slug: string): boolean {
  return normalizeCategoryAttrSlug(slug) === CATEGORY_ATTR_SLUG_WEATHERSTRIP;
}
