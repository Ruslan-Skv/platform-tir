export interface AttributeValue {
  id: string;
  value: string;
  colorHex?: string;
  order?: number;
}

export interface Attribute {
  id: string;
  name: string;
  slug: string;
  type: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'MULTI_SELECT' | 'COLOR';
  unit?: string;
  isFilterable: boolean;
  values: AttributeValue[];
}

export interface CategoryAttribute {
  id: string;
  attributeId: string;
  isRequired: boolean;
  order: number;
  /** true — атрибут виден из родительской категории, своей привязки у этой категории нет */
  isInherited?: boolean;
  /**
   * true — у категории есть своя привязка, но тот же атрибут уже есть у родителя.
   * Удаление снимет только дубль; атрибут останется в блоке «Унаследованные».
   */
  isAlsoInherited?: boolean;
  attribute: Attribute;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  parent?: {
    id: string;
    name: string;
  } | null;
}

export interface CategoryAttributesPageProps {
  categoryId: string;
}

export interface AttributeFormState {
  name: string;
  slug: string;
  type: Attribute['type'];
  unit: string;
  isFilterable: boolean;
  optionRows: string[];
}
