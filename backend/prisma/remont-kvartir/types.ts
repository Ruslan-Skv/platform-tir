export interface RemontKvartirItemDef {
  name: string;
  unit: string;
  /** Цена по умолчанию; в каталоге часто «по запросу» — 0 */
  price?: string;
}

export interface RemontKvartirSubcategoryDef {
  name: string;
  items: RemontKvartirItemDef[];
}

export interface RemontKvartirGroupDef {
  name: string;
  slug: string;
  icon: string | null;
  /** Текст для пустых/поясняющих групп (например «Жалюзи») */
  description?: string;
  subcategories: RemontKvartirSubcategoryDef[];
}
