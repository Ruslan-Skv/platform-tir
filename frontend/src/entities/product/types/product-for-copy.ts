/** Ответ API товара при копировании (админка). */
export interface ProductForCopy {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  description: string | null;
  price: string | number;
  comparePrice?: string | number | null;
  stock: number;
  onOrder?: boolean;
  categoryId?: string;
  category?: { id: string };
  isActive: boolean;
  isFeatured: boolean;
  isNew: boolean;
  partnerId?: string | null;
  sortOrder?: number;
  images: string[];
  videoUrl?: string | null;
  weight?: number | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  attributes?: Record<string, string> | Array<{ name: string; value: string }> | null;
  sizes?: string[];
  openingSide?: string[];
  suppliers?: Array<{
    supplierId: string;
    isMainSupplier: boolean;
    supplierSku?: string;
    supplierPrice?: string | number;
    supplierProductUrl?: string | null;
  }>;
  cardBadgeSelections?: Array<{
    sortOrder: number;
    badgeId: string;
  }>;
  manufacturerId?: string | null;
  manufacturer?: { name: string } | null;
  coatingMaterialId?: string | null;
  coatingMaterial?: { name: string } | null;
  canvasTypeId?: string | null;
  canvasType?: { name: string } | null;
  doorThicknessId?: string | null;
  doorThickness?: { name: string } | null;
  weatherstripId?: string | null;
  weatherstrip?: { name: string } | null;
}

export interface CategoryAttributeForCopy {
  id: string;
  attributeId: string;
  isRequired: boolean;
  order: number;
  attribute: {
    id: string;
    name: string;
    slug: string;
    type?: string;
    unit?: string;
    values?: Array<{ id: string; value: string }>;
  };
}
