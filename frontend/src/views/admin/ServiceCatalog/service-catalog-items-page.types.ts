export interface ServiceCatalogItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  sortOrder: number;
  isActive: boolean;
  category?: { id: string; name: string; slug: string };
}

export interface ServiceCatalogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  sortOrder: number;
  isActive: boolean;
  /** Наценка на группу, % к базовой цене видов работ в этой категории. */
  priceMarkupPercent?: number;
  parentId?: string | null;
  children?: ServiceCatalogCategory[];
  items?: ServiceCatalogItem[];
  _count?: { items: number };
}

export type ServiceCatalogUiPersist = {
  collapsedCategoryIds: string[];
  nestedChildBlocksHiddenRoots: string[];
};

export type StructuralCategoryRow = {
  node: ServiceCatalogCategory;
  parentId: string | undefined;
};

export type CategoryMarkupLookupRow = { parentId: string | null; priceMarkupPercent: number };

export type ServiceCatalogDeleteTarget = {
  type: 'item';
  id: string;
  name: string;
};

export type NewServiceCatalogItemForm = {
  name: string;
  description: string;
  price: string;
  unit: string;
};
