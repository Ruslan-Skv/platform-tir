export type ProductAttributeValue = {
  id: string;
  value: string;
  colorHex?: string;
};

export type ProductAttribute = {
  id: string;
  name: string;
  slug: string;
  type: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'MULTI_SELECT' | 'COLOR';
  unit?: string;
  isFilterable: boolean;
  values: ProductAttributeValue[];
};

export type ProductCategoryAttribute = {
  id: string;
  attributeId: string;
  isRequired: boolean;
  order: number;
  attribute: ProductAttribute;
};

export type CatalogFkOption = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
};

export type ProductCustomAttribute = {
  key: string;
  value: string;
};

/** Поля формы, используемые секцией характеристик. */
export type ProductAttributesFormSlice = {
  attributes: Record<string, string>;
  manufacturerId: string;
  coatingMaterialId: string;
  canvasTypeId: string;
  doorThicknessId: string;
  weatherstripId: string;
};
